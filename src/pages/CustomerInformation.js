import React, { useState, useEffect, useCallback } from 'react';
import { Container, Card, Table, Button, Form, Modal, Alert, Spinner, Row, Col, InputGroup, Badge } from 'react-bootstrap';
import { useAuth } from '../contexts/AuthContext';
import MainNavbar from '../components/Navbar';
import PageHeader from '../components/PageHeader';
import { db } from '../firebase/config';
import { collection, addDoc, updateDoc, deleteDoc, doc, query, where, getDocs } from 'firebase/firestore';

const CustomerInformation = () => {
  const { currentUser, activeShopId } = useAuth();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    notes: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState(null);
  const [loans, setLoans] = useState([]);
  const [loansLoading, setLoansLoading] = useState(false);
  const [showLoansModal, setShowLoansModal] = useState(false);
  const [selectedCustomerLoans, setSelectedCustomerLoans] = useState([]);
  const [selectedCustomerName, setSelectedCustomerName] = useState('');

  const fetchCustomers = useCallback(async () => {
    if (!activeShopId) return;
    
    setLoading(true);
    try {
      const customersRef = collection(db, 'customers');
      const q = query(
        customersRef,
        where('shopId', '==', activeShopId)
      );
      const querySnapshot = await getDocs(q);
      const customersData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      // Sort by name in JavaScript to avoid Firestore index requirement
      customersData.sort((a, b) => {
        const nameA = (a.name || '').toLowerCase();
        const nameB = (b.name || '').toLowerCase();
        return nameA.localeCompare(nameB);
      });
      setCustomers(customersData);
    } catch (err) {
      console.error('Error fetching customers:', err);
      setError('Failed to load customers');
    } finally {
      setLoading(false);
    }
  }, [activeShopId]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  useEffect(() => {
    const fetchLoans = async () => {
      if (!activeShopId) return;
      setLoansLoading(true);
      try {
        const loansRef = collection(db, 'customerLoans');
        const q = query(loansRef, where('shopId', '==', activeShopId));
        const snapshot = await getDocs(q);
        const loanData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setLoans(loanData);
      } catch (err) {
        console.error('Error fetching customer loans:', err);
      } finally {
        setLoansLoading(false);
      }
    };
    fetchLoans();
  }, [activeShopId]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!formData.name.trim()) {
      setError('Customer name is required');
      return;
    }

    if (!activeShopId) {
      setError('Shop ID is missing');
      return;
    }

    try {
      const customerData = {
        ...formData,
        shopId: activeShopId,
        createdAt: editingCustomer ? editingCustomer.createdAt : new Date(),
        updatedAt: new Date()
      };

      if (editingCustomer) {
        const customerRef = doc(db, 'customers', editingCustomer.id);
        await updateDoc(customerRef, customerData);
        setSuccess('Customer updated successfully');
      } else {
        await addDoc(collection(db, 'customers'), customerData);
        setSuccess('Customer added successfully');
      }

      setShowModal(false);
      resetForm();
      fetchCustomers();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error saving customer:', err);
      setError('Failed to save customer: ' + err.message);
    }
  };

  const handleEdit = (customer) => {
    setEditingCustomer(customer);
    setFormData({
      name: customer.name || '',
      phone: customer.phone || '',
      email: customer.email || '',
      address: customer.address || '',
      city: customer.city || '',
      notes: customer.notes || ''
    });
    setShowModal(true);
  };

  const handleDelete = (customer) => {
    setCustomerToDelete(customer);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!customerToDelete) return;

    try {
      await deleteDoc(doc(db, 'customers', customerToDelete.id));
      setSuccess('Customer deleted successfully');
      setShowDeleteModal(false);
      setCustomerToDelete(null);
      fetchCustomers();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error deleting customer:', err);
      setError('Failed to delete customer: ' + err.message);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      phone: '',
      email: '',
      address: '',
      city: '',
      notes: ''
    });
    setEditingCustomer(null);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    resetForm();
  };

  const filteredCustomers = customers.filter(customer =>
    customer.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.phone?.includes(searchTerm) ||
    customer.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      <MainNavbar />
      <Container className="pos-content">
        <PageHeader
          title="Customer Information"
          icon="bi-people"
          subtitle="Manage your customer database and contact information."
        >
          <div className="hero-metrics__item">
            <span className="hero-metrics__label">Total Customers</span>
            <span className="hero-metrics__value">{customers.length}</span>
          </div>
        </PageHeader>

        <div className="page-header-actions mb-3">
          <Button variant="primary" onClick={() => { resetForm(); setShowModal(true); }}>
            <i className="bi bi-plus-circle me-2"></i>Add Customer
          </Button>
        </div>

        {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}
        {success && <Alert variant="success" dismissible onClose={() => setSuccess('')}>{success}</Alert>}

        <Card>
          <Card.Body>
            <Row className="mb-3">
              <Col md={6}>
                <InputGroup>
                  <InputGroup.Text>
                    <i className="bi bi-search"></i>
                  </InputGroup.Text>
                  <Form.Control
                    type="text"
                    placeholder="Search by name, phone, or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </InputGroup>
              </Col>
            </Row>

            {loading ? (
              <div className="text-center py-4">
                <Spinner animation="border" />
              </div>
            ) : filteredCustomers.length === 0 ? (
              <div className="text-center py-4">
                <i className="bi bi-people" style={{ fontSize: '3rem', color: '#ccc' }}></i>
                <p className="text-muted mt-3">
                  {searchTerm ? 'No customers found matching your search.' : 'No customers added yet. Click "Add Customer" to get started.'}
                </p>
              </div>
            ) : (
              <Table responsive hover>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Phone</th>
                    <th>Email</th>
                    <th>Address</th>
                    <th>City</th>
                    <th>Loans</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCustomers.map(customer => (
                    <tr key={customer.id}>
                      <td>{customer.name}</td>
                      <td>{customer.phone || '-'}</td>
                      <td>{customer.email || '-'}</td>
                      <td>{customer.address || '-'}</td>
                      <td>{customer.city || '-'}</td>
                      <td>
                        {(() => {
                          const custLoans = loans.filter(l => (l.customerName || '').toLowerCase() === (customer.name || '').toLowerCase());
                          const count = custLoans.length;
                          const total = custLoans.reduce((s, l) => s + (parseFloat(l.amount) || 0), 0);
                          return (
                            <div>
                              <Badge bg={count > 0 ? 'danger' : 'secondary'}>{count}</Badge>
                              <span className="ms-2">RS {total.toFixed(2)}</span>
                            </div>
                          );
                        })()}
                      </td>
                      <td>
                        <Button
                          variant="outline-primary"
                          size="sm"
                          className="me-2"
                          onClick={() => {
                            const custLoans = loans.filter(l => (l.customerName || '').toLowerCase() === (customer.name || '').toLowerCase());
                            setSelectedCustomerLoans(custLoans);
                            setSelectedCustomerName(customer.name || '');
                            setShowLoansModal(true);
                          }}
                        >
                          View Loans
                        </Button>
                        <Button
                          variant="outline-primary"
                          size="sm"
                          className="me-2"
                          onClick={() => handleEdit(customer)}
                        >
                          <i className="bi bi-pencil"></i> Edit
                        </Button>
                        <Button
                          variant="outline-danger"
                          size="sm"
                          onClick={() => handleDelete(customer)}
                        >
                          <i className="bi bi-trash"></i> Delete
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Card.Body>
        </Card>

        {/* Add/Edit Modal */}
        <Modal show={showModal} onHide={handleCloseModal} size="lg">
          <Modal.Header closeButton>
            <Modal.Title>{editingCustomer ? 'Edit Customer' : 'Add New Customer'}</Modal.Title>
          </Modal.Header>
          <Form onSubmit={handleSubmit}>
            <Modal.Body>
              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Name *</Form.Label>
                    <Form.Control
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      required
                      placeholder="Customer name"
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Phone</Form.Label>
                    <Form.Control
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      placeholder="Phone number"
                    />
                  </Form.Group>
                </Col>
              </Row>
              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Email</Form.Label>
                    <Form.Control
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="Email address"
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>City</Form.Label>
                    <Form.Control
                      type="text"
                      name="city"
                      value={formData.city}
                      onChange={handleInputChange}
                      placeholder="City"
                    />
                  </Form.Group>
                </Col>
              </Row>
              <Form.Group className="mb-3">
                <Form.Label>Address</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={2}
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  placeholder="Full address"
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Notes</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  placeholder="Additional notes about the customer"
                />
              </Form.Group>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onClick={handleCloseModal}>
                Cancel
              </Button>
              <Button variant="primary" type="submit">
                {editingCustomer ? 'Update' : 'Add'} Customer
              </Button>
            </Modal.Footer>
          </Form>
        </Modal>

        {/* Delete Confirmation Modal */}
        <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)}>
          <Modal.Header closeButton>
            <Modal.Title>Delete Customer</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <p>Are you sure you want to delete <strong>{customerToDelete?.name}</strong>?</p>
            <p className="text-muted small">This action cannot be undone.</p>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={confirmDelete}>
              Delete
            </Button>
          </Modal.Footer>
        </Modal>
      </Container>

      <Modal show={showLoansModal} onHide={() => setShowLoansModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Loan History - {selectedCustomerName}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {loansLoading ? (
            <div className="text-center py-3"><Spinner animation="border" /></div>
          ) : selectedCustomerLoans.length === 0 ? (
            <p className="text-muted">No loans recorded for this customer.</p>
          ) : (
            <Table hover size="sm">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Transaction</th>
                  <th>Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {selectedCustomerLoans.map(loan => (
                  <tr key={loan.id}>
                    <td>{loan.timestamp ? new Date(loan.timestamp).toLocaleString() : '-'}</td>
                    <td>{loan.transactionId || loan.receiptId || '-'}</td>
                    <td>RS {(parseFloat(loan.amount) || 0).toFixed(2)}</td>
                    <td>{loan.status || 'outstanding'}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowLoansModal(false)}>Close</Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default CustomerInformation;

