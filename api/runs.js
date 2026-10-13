import { db, email } from 'hatchable';
export const access = 'public';

const WORKFLOWS = ['Order Processing', 'Invoice Preparation', 'Stock Reconciliation'];
const EMAIL_BLOCKLIST = ['.example', '.test', '.invalid', '.localhost'];

const asJson = value => JSON.stringify(value ?? {});
const money = value => Math.round(Number(value) * 100) / 100;
const validEmail = value => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '')) &&
  !EMAIL_BLOCKLIST.some(suffix => String(value).toLowerCase().endsWith(suffix));

async function audit(actor, action, entityType, entityId, details = {}) {
  await db.query(
    'INSERT INTO audit_events(actor,action,entity_type,entity_id,details) VALUES($1,$2,$3,$4,$5::jsonb)',
    [actor, action, entityType, entityId == null ? null : String(entityId), asJson(details)]
  );
}

async function updateRun(id, patch) {
  const fields = [];
  const values = [];
  for (const [key, value] of Object.entries(patch)) {
    values.push(key === 'steps' || key === 'result' ? asJson(value) : value);
    fields.push(key + '=$' + values.length + (key === 'steps' || key === 'result' ? '::jsonb' : ''));
  }
  values.push(id);
  const r = await db.query(
    'UPDATE workflow_runs SET ' + fields.join(',') + ',updated_at=now() WHERE id=$' + values.length + ' RETURNING *',
    values
  );
  return r.rows[0];
}

async function markStep(run, index, patch) {
  const steps = [...run.steps];
  steps[index] = { ...steps[index], ...patch, updatedAt: new Date().toISOString() };
  run.steps = steps;
  await updateRun(run.id, { steps });
}

async function step(run, index, operation) {
  await markStep(run, index, { status: 'Running', attempt: (run.steps[index].attempt || 0) + 1, verified: false, error: null });
  try {
    const output = await operation();
    await markStep(run, index, { status: 'Succeeded', verified: true, output: typeof output === 'string' ? output : JSON.stringify(output) });
    return output;
  } catch (error) {
    await markStep(run, index, { status: 'Failed', verified: false, error: String(error.message || error) });
    throw error;
  }
}

async function sendTrackedEmail({ run, recipient, subject, html, text: plainText }) {
  const existing = await db.query('SELECT id,status,provider_message_id FROM email_outbox WHERE workflow_run_id=$1 LIMIT 1', [run.id]);
  if (existing.rows.length && existing.rows[0].status === 'Sent') {
    return { status: 'Sent', messageId: existing.rows[0].provider_message_id, reused: true };
  }
  if (!validEmail(recipient)) {
    const reason = 'No deliverable customer email. Replace sample/invalid customer addresses before enabling delivery.';
    await db.query(
      "INSERT INTO email_outbox(workflow_run_id,recipient,subject,status,error,attempts) VALUES($1,$2,$3,'Skipped',$4,0) ON CONFLICT (workflow_run_id) DO UPDATE SET status='Skipped',error=EXCLUDED.error",
      [run.id, String(recipient || ''), subject, reason]
    );
    return { status: 'Skipped', reason };
  }
  const saved = await db.query(
    "INSERT INTO email_outbox(workflow_run_id,recipient,subject,status,attempts) VALUES($1,$2,$3,'Sending',1) ON CONFLICT (workflow_run_id) DO UPDATE SET recipient=EXCLUDED.recipient,subject=EXCLUDED.subject,status='Sending',error=NULL,attempts=email_outbox.attempts+1 RETURNING id",
    [run.id, recipient, subject]
  );
  try {
    const sent = await email.send({ to: recipient, subject, html, text: plainText });
    await db.query(
      "UPDATE email_outbox SET status='Sent',provider_message_id=$1,sent_at=now(),error=NULL WHERE id=$2",
      [sent?.message_id || sent?.ses_message_id || null, saved.rows[0].id]
    );
    await audit('FixFlow email service', 'Email sent', 'email_outbox', saved.rows[0].id, { workflowRunId: run.id, recipient, providerMessageId: sent?.message_id || sent?.ses_message_id || null });
    return { status: 'Sent', messageId: sent?.message_id || sent?.ses_message_id || null };
  } catch (error) {
    await db.query("UPDATE email_outbox SET status='Failed',error=$1 WHERE id=$2", [String(error.message || error).slice(0, 1000), saved.rows[0].id]);
    return { status: 'Failed', reason: String(error.message || error).slice(0, 300) };
  }
}

async function executeOrder(run, input) {
  const customer = await step(run, 0, async () => {
    const q = input.customerId
      ? await db.query('SELECT id,name,email,company FROM customers WHERE id=$1 LIMIT 1', [input.customerId])
      : input.customerEmail
        ? await db.query('SELECT id,name,email,company FROM customers WHERE lower(email)=lower($1) LIMIT 1', [input.customerEmail])
        : await db.query('SELECT id,name,email,company FROM customers ORDER BY created_at ASC LIMIT 1');
    if (!q.rows.length) throw new Error('Customer not found. Add a customer record or select an existing customer.');
    return q.rows[0];
  });
  const product = await step(run, 1, async () => {
    const sku = String(input.sku || 'SKU-104').trim();
    const q = await db.query('SELECT id,sku,name,price,stock FROM products WHERE sku=$1 LIMIT 1', [sku]);
    if (!q.rows.length) throw new Error('Product SKU not found: ' + sku);
    const quantity = Number(input.quantity || 1);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 10000) throw new Error('Quantity must be a whole number between 1 and 10000.');
    if (Number(q.rows[0].stock) < quantity) throw new Error('Insufficient stock. Available: ' + q.rows[0].stock);
    return { ...q.rows[0], quantity };
  });
  const order = await step(run, 2, async () => {
    const existing = await db.query('SELECT * FROM orders WHERE idempotency_key=$1 LIMIT 1', ['order:' + run.id]);
    if (existing.rows.length) return existing.rows[0];
    const stockUpdate = await db.query('UPDATE products SET stock=stock-$1 WHERE id=$2 AND stock >= $1 RETURNING id,sku,name,price,stock', [product.quantity, product.id]);
    if (!stockUpdate.rows.length) throw new Error('Stock changed while this order was being processed. Refresh inventory and retry.');
    const total = money(Number(product.price) * product.quantity);
    const orderNo = 'FF-' + new Date().toISOString().slice(0,10).replaceAll('-','') + '-' + String(run.id).replaceAll('-','').slice(0,8).toUpperCase();
    try {
      const created = await db.query(
        'INSERT INTO orders(order_no,customer_id,customer_name,items,total,status,idempotency_key) VALUES($1,$2,$3,$4::jsonb,$5,$6,$7) RETURNING *',
        [orderNo, customer.id, customer.name, asJson([{ sku: product.sku, name: product.name, quantity: product.quantity, unitPrice: Number(product.price), lineTotal: total }]), total, 'processed', 'order:' + run.id]
      );
      await db.query(
        'INSERT INTO stock_movements(product_id,sku,quantity_delta,quantity_before,quantity_after,reason,reference_type,reference_id,created_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)',
        [product.id, product.sku, -product.quantity, Number(product.stock), Number(stockUpdate.rows[0].stock), 'Order fulfillment', 'order', created.rows[0].id, 'FixFlow engine']
      );
      return created.rows[0];
    } catch (error) {
      await db.query('UPDATE products SET stock=stock+$1 WHERE id=$2', [product.quantity, product.id]);
      throw error;
    }
  });
  await step(run, 3, async () => {
    const q = await db.query('SELECT stock FROM products WHERE id=$1', [product.id]);
    if (!q.rows.length || Number(q.rows[0].stock) !== Number(product.stock) - product.quantity) {
      // A concurrent order may legitimately reduce stock further; verify it is at least non-negative.
      if (!q.rows.length || Number(q.rows[0].stock) < 0) throw new Error('Inventory verification failed.');
    }
    return { orderId: order.id, orderNo: order.order_no, total: order.total, remainingStock: q.rows[0].stock };
  });
  const mail = await step(run, 4, async () => sendTrackedEmail({
    run, recipient: customer.email,
    subject: 'FixFlow order confirmation ' + order.order_no,
    html: '<h2>Order confirmed</h2><p>Hello ' + escapeHtml(customer.name) + ',</p><p>Your order <strong>' + escapeHtml(order.order_no) + '</strong> has been recorded.</p><p>Total: $' + Number(order.total).toFixed(2) + '</p>',
    text: 'Hello ' + customer.name + ',\nYour order ' + order.order_no + ' has been recorded. Total: $' + Number(order.total).toFixed(2)
  }));
  return { orderId: order.id, orderNo: order.order_no, customer: customer.name, sku: product.sku, quantity: product.quantity, total: Number(order.total), email: mail };
}

async function executeInvoice(run, input) {
  const order = await step(run, 0, async () => {
    let q;
    if (input.orderRef) q = await db.query('SELECT * FROM orders WHERE id::text=$1 OR order_no=$1 LIMIT 1', [String(input.orderRef).trim()]);
    else q = await db.query("SELECT * FROM orders WHERE status IN ('processed','processing','completed') ORDER BY created_at DESC LIMIT 1");
    if (!q?.rows?.length) throw new Error('Order not found. Enter an order number or run Order Processing first.');
    return q.rows[0];
  });
  const invoice = await step(run, 1, async () => {
    const prior = await db.query('SELECT * FROM invoices WHERE order_id=$1 LIMIT 1', [order.id]);
    if (prior.rows.length) return prior.rows[0];
    const invoiceNo = 'INV-' + String(run.id).replaceAll('-','').slice(0,10).toUpperCase();
    const q = await db.query("INSERT INTO invoices(invoice_no,order_id,customer_name,total,status) VALUES($1,$2,$3,$4,'Prepared') ON CONFLICT(order_id) DO UPDATE SET order_id=EXCLUDED.order_id RETURNING *", [invoiceNo, order.id, order.customer_name, order.total]);
    return q.rows[0];
  });
  const mail = await step(run, 2, async () => {
    const q = await db.query('SELECT email FROM customers WHERE id=$1 LIMIT 1', [order.customer_id]);
    const recipient = q.rows[0]?.email || '';
    return sendTrackedEmail({
      run, recipient, subject: 'Invoice ' + invoice.invoice_no + ' for order ' + order.order_no,
      html: '<h2>Invoice prepared</h2><p>Customer: ' + escapeHtml(order.customer_name) + '</p><p>Invoice: <strong>' + escapeHtml(invoice.invoice_no) + '</strong></p><p>Order: ' + escapeHtml(order.order_no) + '</p><p>Total due: $' + Number(invoice.total).toFixed(2) + '</p>',
      text: 'Invoice ' + invoice.invoice_no + '\nOrder: ' + order.order_no + '\nCustomer: ' + order.customer_name + '\nTotal due: $' + Number(invoice.total).toFixed(2)
    });
  });
  await step(run, 3, async () => {
    const q = await db.query('SELECT invoice_no,order_id,total,status FROM invoices WHERE id=$1', [invoice.id]);
    if (!q.rows.length || Number(q.rows[0].total) !== Number(order.total)) throw new Error('Invoice verification failed.');
    return { invoiceNo: q.rows[0].invoice_no, total: q.rows[0].total, emailStatus: mail.status };
  });
  return { invoiceId: invoice.id, invoiceNo: invoice.invoice_no, orderNo: order.order_no, customer: order.customer_name, total: Number(invoice.total), email: mail };
}

async function executeStock(run, input) {
  const product = await step(run, 0, async () => {
    const sku = String(input.sku || '').trim();
    const physicalStock = Number(input.physicalStock);
    if (!sku) throw new Error('Enter the product SKU for reconciliation.');
    if (!Number.isInteger(physicalStock) || physicalStock < 0) throw new Error('Physical stock count must be a non-negative whole number.');
    const q = await db.query('SELECT id,sku,name,stock FROM products WHERE sku=$1 LIMIT 1', [sku]);
    if (!q.rows.length) throw new Error('Product SKU not found: ' + sku);
    return { ...q.rows[0], physicalStock };
  });
  const adjustment = await step(run, 1, async () => {
    const delta = product.physicalStock - Number(product.stock);
    if (delta === 0) return { changed: false, delta: 0, stock: Number(product.stock), message: 'Physical count matches system stock.' };
    const updated = await db.query('UPDATE products SET stock=$1 WHERE id=$2 AND stock=$3 RETURNING stock', [product.physicalStock, product.id, product.stock]);
    if (!updated.rows.length) throw new Error('Inventory changed concurrently. Refresh and reconcile again.');
    await db.query(
      'INSERT INTO stock_movements(product_id,sku,quantity_delta,quantity_before,quantity_after,reason,reference_type,reference_id,created_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)',
      [product.id, product.sku, delta, Number(product.stock), product.physicalStock, 'Physical stock reconciliation', 'workflow_run', run.id, 'FixFlow engine']
    );
    return { changed: true, delta, before: Number(product.stock), after: product.physicalStock };
  });
  await step(run, 2, async () => {
    const q = await db.query('SELECT stock FROM products WHERE id=$1', [product.id]);
    if (!q.rows.length || Number(q.rows[0].stock) !== product.physicalStock) throw new Error('Stock reconciliation verification failed.');
    return { sku: product.sku, verifiedStock: Number(q.rows[0].stock) };
  });
  return { sku: product.sku, product: product.name, adjustment };
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

export default async function(req, res) {
  try {
    if (req.method === 'GET') {
      const r = await db.query('SELECT id,workflow,status,input,steps,result,created_at,updated_at FROM workflow_runs ORDER BY created_at DESC LIMIT 100');
      return res.json({ runs: r.rows });
    }
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    const body = req.body || {};
    if (!WORKFLOWS.includes(body.workflow)) return res.status(400).json({ error: 'Choose a supported workflow.' });
    const input = body.input || {};
    const key = String(input.idempotencyKey || '').trim();
    if (!key || key.length > 128) return res.status(400).json({ error: 'A valid idempotency key is required. Refresh the form and retry.' });
    const prior = await db.query('SELECT * FROM workflow_runs WHERE idempotency_key=$1 LIMIT 1', [key]);
    if (prior.rows.length) return res.json({ run: prior.rows[0], reused: true });

    const stepNames = body.workflow === 'Order Processing'
      ? ['Validate customer and request', 'Validate product and stock', 'Create order and reserve inventory', 'Verify persisted inventory and order', 'Send order confirmation']
      : body.workflow === 'Invoice Preparation'
        ? ['Find and validate order', 'Create or reuse invoice', 'Send invoice email', 'Verify persisted invoice']
        : ['Validate SKU and physical count', 'Apply inventory reconciliation', 'Verify persisted stock'];
    const steps = stepNames.map((name, i) => ({ id: i + 1, name, status: 'Pending', attempt: 0, verified: false }));
    const created = await db.query(
      'INSERT INTO workflow_runs(workflow,status,input,steps,idempotency_key) VALUES($1,$2,$3::jsonb,$4::jsonb,$5) ON CONFLICT(idempotency_key) WHERE idempotency_key IS NOT NULL DO NOTHING RETURNING *',
      [body.workflow, 'Running', asJson(input), asJson(steps), key]
    );
    if (!created.rows.length) {
      const q = await db.query('SELECT * FROM workflow_runs WHERE idempotency_key=$1 LIMIT 1', [key]);
      return res.json({ run: q.rows[0], reused: true });
    }
    const run = created.rows[0];
    let result;
    try {
      if (body.workflow === 'Order Processing') result = await executeOrder(run, input);
      else if (body.workflow === 'Invoice Preparation') result = await executeInvoice(run, input);
      else result = await executeStock(run, input);
      const failedEmail = result.email?.status === 'Failed';
      const finalStatus = failedEmail ? 'Partially Failed' : 'Succeeded';
      const updated = await updateRun(run.id, { status: finalStatus, result });
      await audit('FixFlow engine', finalStatus === 'Succeeded' ? 'Workflow completed' : 'Workflow completed with email failure', 'workflow_run', run.id, { workflow: run.workflow, status: finalStatus, result });
      return res.status(201).json({ run: updated, reused: false });
    } catch (error) {
      const current = await db.query('SELECT steps FROM workflow_runs WHERE id=$1', [run.id]);
      const failed = (current.rows[0]?.steps || run.steps).map(s => s.status === 'Running' ? { ...s, status: 'Failed', verified: false, error: String(error.message || error) } : s);
      const updated = await updateRun(run.id, { status: 'Failed', steps: failed, result: { error: String(error.message || error), recoverable: true } });
      await audit('FixFlow engine', 'Workflow failed', 'workflow_run', run.id, { workflow: run.workflow, error: String(error.message || error) });
      return res.status(409).json({ error: String(error.message || error), run: updated });
    }
  } catch (error) {
    return res.status(500).json({ error: 'Workflow operation failed', detail: String(error.message || error).slice(0, 300) });
  }
}