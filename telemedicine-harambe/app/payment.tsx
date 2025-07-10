import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuthStore } from '../store/authStore';
import { paymentsAPI, appointmentsAPI } from '../services/api';

interface PaymentMethod {
  id: string;
  name: string;
  description: string;
  icon: string;
  instructions: string;
}

interface Appointment {
  _id: string;
  dateTime: string;
  status: string;
  patientId?: { name: string; email: string };
  doctorId?: { name: string; email: string; specialty: string };
  note?: string;
}

export default function PaymentScreen() {
  const { user } = useAuthStore();
  const router = useRouter();
  const { appointmentId } = useLocalSearchParams<{ appointmentId: string }>();
  
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [paymentDetails, setPaymentDetails] = useState({
    phoneNumber: '',
    accountNumber: '',
    referenceNumber: '',
  });
  const [existingPayment, setExistingPayment] = useState<any>(null);

  useEffect(() => {
    if (appointmentId) {
      loadAppointment();
      loadPaymentMethods();
      checkExistingPayment();
    }
  }, [appointmentId]);

  const loadAppointment = async () => {
    try {
      const response = await appointmentsAPI.getAppointmentById(appointmentId);
      setAppointment(response.data);
    } catch (error) {
      console.error('Error loading appointment:', error);
      Alert.alert('Error', 'Failed to load appointment details');
    }
  };

  const loadPaymentMethods = async () => {
    try {
      const response = await paymentsAPI.getPaymentMethods();
      setPaymentMethods(response.data);
    } catch (error) {
      console.error('Error loading payment methods:', error);
      Alert.alert('Error', 'Failed to load payment methods');
    }
  };

  const checkExistingPayment = async () => {
    try {
      const response = await paymentsAPI.getPaymentByAppointment(appointmentId);
      setExistingPayment(response.data);
    } catch (error: any) {
      if (error.response?.status !== 404) {
        console.error('Error checking existing payment:', error);
      }
      setExistingPayment(null);
    }
  };

  const handlePaymentMethodSelect = (method: PaymentMethod) => {
    setSelectedMethod(method);
    setShowPaymentModal(true);
  };

  const handleCreatePayment = async () => {
    if (!selectedMethod || !appointmentId) {
      Alert.alert('Error', 'Please select a payment method');
      return;
    }

    setLoading(true);
    try {
      const paymentData = {
        appointmentId,
        paymentMethod: selectedMethod.id,
        paymentDetails: {
          ...paymentDetails,
          bankName: selectedMethod.name,
        },
      };

      const response = await paymentsAPI.createPayment(paymentData);
      
      Alert.alert(
        'Payment Created',
        `Transaction ID: ${response.data.payment.transactionId}\n\nPlease complete the payment using the selected method and then mark it as completed.`,
        [
          {
            text: 'Mark as Completed',
            onPress: () => handleMarkPaymentComplete(response.data.payment._id),
          },
          {
            text: 'View Payment',
            onPress: () => router.push(`/payment-details/${response.data.payment._id}`),
          },
          { text: 'OK' },
        ]
      );

      setShowPaymentModal(false);
      setSelectedMethod(null);
      setPaymentDetails({ phoneNumber: '', accountNumber: '', referenceNumber: '' });
      
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to create payment');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkPaymentComplete = async (paymentId: string) => {
    try {
      await paymentsAPI.updatePaymentStatus(paymentId, 'completed', 'Payment completed by user');
      Alert.alert('Success', 'Payment marked as completed!');
      router.back();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to update payment status');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (!appointment) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3498db" />
          <Text style={styles.loadingText}>Loading appointment details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Payment</Text>
        <View style={{ width: 50 }} />
      </View>

      <ScrollView style={styles.content}>
        {/* Appointment Details */}
        <View style={styles.appointmentCard}>
          <Text style={styles.sectionTitle}>Appointment Details</Text>
          <Text style={styles.appointmentDate}>
            {formatDate(appointment.dateTime)}
          </Text>
          {appointment.doctorId && (
            <>
              <Text style={styles.doctorName}>
                Dr. {appointment.doctorId.name}
              </Text>
              <Text style={styles.specialty}>
                {appointment.doctorId.specialty}
              </Text>
            </>
          )}
          <View style={styles.amountContainer}>
            <Text style={styles.amountLabel}>Consultation Fee:</Text>
            <Text style={styles.amount}>500 ETB</Text>
          </View>
        </View>

        {/* Payment Methods */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Payment Method</Text>
          <Text style={styles.sectionSubtitle}>
            Choose your preferred payment method
          </Text>
        </View>

        {/* Show existing payment status if available */}
        {existingPayment && (
          <View style={styles.existingPaymentCard}>
            <Text style={styles.existingPaymentTitle}>Existing Payment</Text>
            <Text style={styles.existingPaymentStatus}>
              Status: {existingPayment.status.charAt(0).toUpperCase() + existingPayment.status.slice(1)}
            </Text>
            <Text style={styles.existingPaymentId}>
              Transaction ID: {existingPayment.transactionId}
            </Text>
            {existingPayment.status === 'completed' && (
              <Text style={styles.completedMessage}>
                ✅ Payment completed! Your appointment is ready for consultation.
              </Text>
            )}
            {existingPayment.status === 'pending' && (
              <Text style={styles.pendingMessage}>
                ⏳ Payment is pending. Please complete the payment process.
              </Text>
            )}
            {existingPayment.status === 'failed' && (
              <Text style={styles.failedMessage}>
                ❌ Payment failed. You can try again with a new payment method.
              </Text>
            )}
            {existingPayment.status === 'cancelled' && (
              <Text style={styles.cancelledMessage}>
                🚫 Payment was cancelled. You can create a new payment.
              </Text>
            )}
            <TouchableOpacity
              style={styles.viewPaymentButton}
              onPress={() => router.push(`/payment-details/${existingPayment._id}`)}
            >
              <Text style={styles.viewPaymentButtonText}>View Payment Details</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Only show payment methods if no completed payment exists */}
        {(!existingPayment || existingPayment.status !== 'completed') && (
          <>
            {paymentMethods.map((method) => (
              <TouchableOpacity
                key={method.id}
                style={styles.paymentMethodCard}
                onPress={() => handlePaymentMethodSelect(method)}
              >
                <View style={styles.methodHeader}>
                  <Text style={styles.methodIcon}>{method.icon}</Text>
                  <View style={styles.methodInfo}>
                    <Text style={styles.methodName}>{method.name}</Text>
                    <Text style={styles.methodDescription}>{method.description}</Text>
                  </View>
                </View>
                <Text style={styles.methodInstructions}>{method.instructions}</Text>
              </TouchableOpacity>
            ))}
          </>
        )}
      </ScrollView>

      {/* Payment Modal */}
      <Modal
        visible={showPaymentModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowPaymentModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              Pay with {selectedMethod?.name}
            </Text>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Instructions</Text>
              <Text style={styles.instructions}>
                {selectedMethod?.instructions}
              </Text>
            </View>

            {selectedMethod?.id === 'telebirr' && (
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Phone Number</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter your phone number"
                  value={paymentDetails.phoneNumber}
                  onChangeText={(text) => setPaymentDetails({ ...paymentDetails, phoneNumber: text })}
                  keyboardType="phone-pad"
                />
              </View>
            )}

            {selectedMethod?.id !== 'telebirr' && (
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Account Number</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter account number"
                  value={paymentDetails.accountNumber}
                  onChangeText={(text) => setPaymentDetails({ ...paymentDetails, accountNumber: text })}
                  keyboardType="numeric"
                />
              </View>
            )}

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Reference Number (Optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter reference number"
                value={paymentDetails.referenceNumber}
                onChangeText={(text) => setPaymentDetails({ ...paymentDetails, referenceNumber: text })}
              />
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelModalButton]}
                onPress={() => setShowPaymentModal(false)}
                disabled={loading}
              >
                <Text style={styles.cancelModalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmModalButton]}
                onPress={handleCreatePayment}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text style={styles.confirmModalButtonText}>Create Payment</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e8ed',
  },
  backButton: {
    fontSize: 16,
    color: '#3498db',
    fontWeight: '500',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#7f8c8d',
  },
  appointmentCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 12,
  },
  appointmentDate: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 8,
  },
  doctorName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 4,
  },
  specialty: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 12,
  },
  amountContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e1e8ed',
  },
  amountLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
  },
  amount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  section: {
    marginBottom: 20,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#7f8c8d',
  },
  paymentMethodCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  methodHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  methodIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  methodInfo: {
    flex: 1,
  },
  methodName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
  },
  methodDescription: {
    fontSize: 14,
    color: '#7f8c8d',
  },
  methodInstructions: {
    fontSize: 14,
    color: '#3498db',
    fontStyle: 'italic',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 20,
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 8,
  },
  instructions: {
    fontSize: 14,
    color: '#7f8c8d',
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    fontStyle: 'italic',
  },
  input: {
    borderWidth: 1,
    borderColor: '#e1e8ed',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelModalButton: {
    backgroundColor: '#e1e8ed',
  },
  confirmModalButton: {
    backgroundColor: '#3498db',
  },
  cancelModalButtonText: {
    color: '#2c3e50',
    fontSize: 16,
    fontWeight: '500',
  },
  confirmModalButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
  existingPaymentCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  existingPaymentTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 10,
  },
  existingPaymentStatus: {
    fontSize: 16,
    color: '#7f8c8d',
    marginBottom: 5,
  },
  existingPaymentId: {
    fontSize: 14,
    color: '#95a5a6',
    marginBottom: 15,
    fontFamily: 'monospace',
  },
  completedMessage: {
    fontSize: 16,
    color: '#27ae60',
    fontWeight: '600',
    marginBottom: 15,
  },
  pendingMessage: {
    fontSize: 16,
    color: '#f39c12',
    fontWeight: '600',
    marginBottom: 15,
  },
  failedMessage: {
    fontSize: 16,
    color: '#e74c3c',
    fontWeight: '600',
    marginBottom: 15,
  },
  cancelledMessage: {
    fontSize: 16,
    color: '#95a5a6',
    fontWeight: '600',
    marginBottom: 15,
  },
  viewPaymentButton: {
    backgroundColor: '#3498db',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  viewPaymentButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
}); 