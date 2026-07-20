# Order lifecycle
The domain status machine supports draft → awaiting payment → payment verified → processing → shipped → delivered, with permitted cancellation/refund paths. Database status values are broader for operations and must be transitioned through a server-side workflow that records status history.

A seller sees only orders attributed to that seller. Delivery evidence and refund decisions must be retained before commission release.
