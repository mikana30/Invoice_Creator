import { useState, useEffect, useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import { api } from '../api';

export default function InvoicePrint({ invoiceId, onBack }) {
  const [invoice, setInvoice] = useState(null);
  const [client, setClient] = useState(null);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const printRef = useRef();

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: invoice?.invoiceNumber || `Invoice-${invoiceId}`,
  });

  useEffect(() => {
    loadInvoice();
  }, [invoiceId]);

  const loadInvoice = async () => {
    try {
      const [invoiceData, clientsData, settingsData] = await Promise.all([
        api.getInvoice(invoiceId),
        api.getClients(),
        api.getSettings(),
      ]);

      setInvoice(invoiceData);
      setSettings(settingsData);

      const clientData = clientsData.find((c) => c.id === invoiceData.clientId);
      setClient(clientData);
    } catch (err) {
      console.error('Failed to load invoice', err);
    } finally {
      setLoading(false);
    }
  };

  const calculateSubtotal = () => {
    if (!invoice || !invoice.items) return 0;
    return invoice.items.reduce((sum, item) => sum + item.quantity * item.price, 0);
  };

  const calculateTax = () => {
    if (!invoice || !invoice.items || !settings) return 0;
    const taxRate = settings.taxRate || 0.08;
    return invoice.items.reduce((sum, item) => {
      if (item.taxExempt) return sum;
      return sum + item.quantity * item.price * taxRate;
    }, 0);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatBusinessAddress = () => {
    if (!settings) return null;
    const lines = [];
    if (settings.businessStreet) lines.push(settings.businessStreet);
    if (settings.businessStreet2) lines.push(settings.businessStreet2);
    const cityStateZip = [settings.businessCity, settings.businessState, settings.businessZip].filter(Boolean);
    if (cityStateZip.length > 0) {
      lines.push(cityStateZip.join(', '));
    }
    return lines;
  };

  const formatClientAddress = () => {
    if (!client) return null;
    const lines = [];
    if (client.street) lines.push(client.street);
    if (client.street2) lines.push(client.street2);
    const cityStateZip = [client.city, client.state, client.zip].filter(Boolean);
    if (cityStateZip.length > 0) {
      lines.push(cityStateZip.join(', '));
    }
    return lines;
  };

  if (loading) return <div className="loading">Loading invoice...</div>;
  if (!invoice) return <div className="empty-state">Invoice not found</div>;

  const taxRate = settings?.taxRate || 0.08;
  const businessAddress = formatBusinessAddress();
  const clientAddress = formatClientAddress();

  return (
    <div>
      <div className="no-print" style={{ marginBottom: '1rem' }}>
        <button className="btn btn-secondary" onClick={onBack} style={{ marginRight: '0.5rem' }}>
          Back
        </button>
        <button className="btn btn-primary" onClick={handlePrint}>
          Print / Save PDF
        </button>
      </div>

      <div ref={printRef} className="invoice-print" style={{ position: 'relative' }}>
        {invoice.paymentStatus === 'voided' && (
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%) rotate(-45deg)',
            fontSize: '6rem',
            fontWeight: 'bold',
            color: 'rgba(255, 0, 0, 0.15)',
            pointerEvents: 'none',
            zIndex: 1000,
            whiteSpace: 'nowrap',
            userSelect: 'none',
          }}>
            VOIDED
          </div>
        )}
        {settings?.bannerImage && (
          <>
            <div className="invoice-banner" style={{
              position: 'absolute',
              top: 0,
              left: '50%',
              transform: 'translateX(-50%)',
              width: '8.5in',
              zIndex: 0
            }}>
              <img
                src={settings.bannerImage}
                alt="Business Banner"
                style={{ width: '100%', height: 'auto' }}
              />
            </div>
            <div style={{ height: '2.5in' }}></div>
          </>
        )}

        <div className="invoice-header" style={{ position: 'relative', zIndex: 1 }}>
          <div>
            <h1>INVOICE</h1>
          </div>
          <div className="invoice-number">
            <h2>{invoice.invoiceNumber || `#${invoice.id}`}</h2>
            <p>Date: {formatDate(invoice.invoiceDate || invoice.createdAt)}</p>
            {invoice.dueDate && <p>Due: {formatDate(invoice.dueDate)}</p>}
          </div>
        </div>

        <div className="invoice-parties">
          <div className="invoice-from">
            <h3>From:</h3>
            <p>
              <strong>{settings?.businessName || 'Your Business Name'}</strong>
              {businessAddress && businessAddress.map((line, i) => (
                <span key={i}><br />{line}</span>
              ))}
              {settings?.businessPhone && (
                <>
                  <br />
                  Phone: {settings.businessPhone}
                </>
              )}
              {settings?.businessEmail && (
                <>
                  <br />
                  Email: {settings.businessEmail}
                </>
              )}
            </p>
          </div>
          <div className="invoice-to">
            <h3>Bill To:</h3>
            {client ? (
              <p>
                <strong>{client.name}</strong>
                {clientAddress && clientAddress.map((line, i) => (
                  <span key={i}><br />{line}</span>
                ))}
                {client.phone && (
                  <>
                    <br />
                    Phone: {client.phone}
                  </>
                )}
                {client.email && (
                  <>
                    <br />
                    Email: {client.email}
                  </>
                )}
              </p>
            ) : (
              <p>Client information not available</p>
            )}
          </div>
        </div>

        <table className="invoice-table">
          <thead>
            <tr>
              <th>Item</th>
              <th className="text-right">Qty</th>
              <th className="text-right">Price</th>
              <th className="text-right">Tax</th>
              <th className="text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items &&
              invoice.items.map((item, index) => (
                <tr key={index}>
                  <td>{item.itemName || 'Item'}</td>
                  <td className="text-right">{item.quantity}</td>
                  <td className="text-right">${parseFloat(item.price).toFixed(2)}</td>
                  <td className="text-right">{item.taxExempt ? 'Exempt' : `${(taxRate * 100).toFixed(1)}%`}</td>
                  <td className="text-right">${(item.quantity * item.price).toFixed(2)}</td>
                </tr>
              ))}
          </tbody>
        </table>

        <div className="invoice-totals">
          <table>
            <tbody>
              <tr>
                <td>Subtotal:</td>
                <td className="text-right">${calculateSubtotal().toFixed(2)}</td>
              </tr>
              <tr>
                <td>Tax ({(taxRate * 100).toFixed(1)}%):</td>
                <td className="text-right">${calculateTax().toFixed(2)}</td>
              </tr>
              <tr className="grand-total">
                <td>Total:</td>
                <td className="text-right">${parseFloat(invoice.total).toFixed(2)}</td>
              </tr>
              {parseFloat(invoice.amountPaid || 0) > 0 && (
                <>
                  <tr>
                    <td>Amount Paid:</td>
                    <td className="text-right">${parseFloat(invoice.amountPaid).toFixed(2)}</td>
                  </tr>
                  <tr className="grand-total" style={{ color: invoice.paymentStatus === 'paid' ? '#27ae60' : '#e74c3c' }}>
                    <td>Balance Due:</td>
                    <td className="text-right">
                      ${(parseFloat(invoice.total) - parseFloat(invoice.amountPaid || 0)).toFixed(2)}
                    </td>
                  </tr>
                </>
              )}
              {invoice.paymentStatus === 'paid' && invoice.paymentDate && (
                <tr>
                  <td colSpan="2" style={{ textAlign: 'center', paddingTop: '1rem', color: '#27ae60', fontWeight: 'bold' }}>
                    PAID on {formatDate(invoice.paymentDate)}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {invoice.notes && (
          <div style={{ marginTop: '2rem', padding: '1rem', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
            <strong>Notes:</strong>
            <p style={{ margin: '0.5rem 0 0', whiteSpace: 'pre-wrap' }}>{invoice.notes}</p>
          </div>
        )}

        <div style={{ marginTop: '3rem', textAlign: 'center', color: '#888' }}>
          <p>Thank you for your business!</p>
        </div>
      </div>
    </div>
  );
}
