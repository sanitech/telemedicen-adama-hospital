import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuthStore } from '../../store/authStore';
import { paymentsAPI } from '../../services/api';

interface Payment {
  _id: string;
  appointmentId: {
    _id: string;
    dateTime: string;
    status: string;
  };
  patientId: { name: string; email: string };
  doctorId: { name: string; email: string; specialty: string };
  amount: number;
  currency: string;
  paymentMethod: string;
  transactionId: string;
  status: string;
  paymentDetails: {
    phoneNumber?: string;
    accountNumber?: string;
    bankName?: string;
    referenceNumber?: string;
  };
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export default function PaymentDetailsScreen() {
  const { user } = useAuthStore();
  const router = useRouter();
  const { paymentId } = useLocalSearchParams<{ paymentId: string }>();
  
  const [payment, setPayment] = useState<Payment | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (paymentId) {
      loadPayment();
    }
  }, [paymentId]);

  const loadPayment = async () => {
    try {
      const response = await paymentsAPI.getPaymentById(paymentId);
      setPayment(response.data);
    } catch (error) {
      console.error('Error loading payment:', error);
      Alert.alert('Error', 'Failed to load payment details');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (status: string) => {
    try {
      await paymentsAPI.updatePaymentStatus(paymentId, status);
      loadPayment();
      Alert.alert('Success', 'Payment status updated!');
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to update status');
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return '#27ae60';
      case 'pending':
        return '#f39c12';
      case 'failed':
        return '#e74c3c';
      case 'cancelled':
        return '#95a5a6';
      default:
        return '#7f8c8d';
    }
  };

  const getPaymentMethodName = (methodId: string) => {
    const methodNames: { [key: string]: string } = {
      telebirr: 'Telebirr',
      cbe_birr: 'CBE Birr',
      dashen_bank: 'Dashen Bank',
      awash_bank: 'Awash Bank',
      bank_of_abyssinia: 'Bank of Abyssinia',
      united_bank: 'United Bank',
      lion_bank: 'Lion Bank',
      cooperative_bank: 'Cooperative Bank',
      nib_bank: 'NIB Bank',
      wewagen_bank: 'Wegagen Bank',
    };
    return methodNames[methodId] || methodId;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3498db" />
          <Text style={styles.loadingText}>Loading payment details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!payment) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Payment not found</Text>
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
        <Text style={styles.title}>Payment Details</Text>
        <View style={{ width: 50 }} />
      </View>

      <ScrollView style={styles.content}>
        {/* Payment Status */}
        <View style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <Text style={styles.statusLabel}>Status</Text>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: getStatusColor(payment.status) },
              ]}
            >
              <Text style={styles.statusText}>
                {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
              </Text>
            </View>
          </View>
          
          {/* Status Update Buttons */}
          {payment.status === 'pending' && (
            <View style={styles.statusActions}>
              <TouchableOpacity
                style={[styles.statusButton, styles.completeButton]}
                onPress={() => handleUpdateStatus('completed')}
              >
                <Text style={styles.statusButtonText}>Mark as Completed</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.statusButton, styles.failButton]}
                onPress={() => handleUpdateStatus('failed')}
              >
                <Text style={styles.statusButtonText}>Mark as Failed</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.statusButton, styles.cancelButton]}
                onPress={() => handleUpdateStatus('cancelled')}
              >
                <Text style={styles.statusButtonText}>Cancel Payment</Text>
              </TouchableOpacity>
            </View>
          )}
          
          {payment.status === 'failed' && (
            <View style={styles.statusActions}>
              <TouchableOpacity
                style={[styles.statusButton, styles.completeButton]}
                onPress={() => handleUpdateStatus('completed')}
              >
                <Text style={styles.statusButtonText}>Mark as Completed</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.statusButton, styles.cancelButton]}
                onPress={() => handleUpdateStatus('cancelled')}
              >
                <Text style={styles.statusButtonText}>Cancel Payment</Text>
              </TouchableOpacity>
            </View>
          )}
          
          {payment.status === 'completed' && (
            <View style={styles.completedMessage}>
              <Text style={styles.completedText}>
                ✅ Payment completed successfully! Your appointment is ready for consultation.
              </Text>
            </View>
          )}
          
          {payment.status === 'cancelled' && (
            <View style={styles.cancelledMessage}>
              <Text style={styles.cancelledText}>
                🚫 Payment was cancelled. You can create a new payment from the appointment screen.
              </Text>
            </View>
          )}
        </View>

        {/* Transaction Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Transaction Details</Text>
          <View style={styles.detailCard}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Transaction ID:</Text>
              <Text style={styles.detailValue}>{payment.transactionId}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Amount:</Text>
              <Text style={styles.amountValue}>
                {payment.amount} {payment.currency}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Payment Method:</Text>
              <Text style={styles.detailValue}>
                {getPaymentMethodName(payment.paymentMethod)}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Created:</Text>
              <Text style={styles.detailValue}>{formatDate(payment.createdAt)}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Updated:</Text>
              <Text style={styles.detailValue}>{formatDate(payment.updatedAt)}</Text>
            </View>
          </View>
        </View>

        {/* Appointment Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Appointment Details</Text>
          <View style={styles.detailCard}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Date & Time:</Text>
              <Text style={styles.detailValue}>
                {formatDate(payment.appointmentId.dateTime)}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Doctor:</Text>
              <Text style={styles.detailValue}>Dr. {payment.doctorId.name}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Specialty:</Text>
              <Text style={styles.detailValue}>{payment.doctorId.specialty}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Patient:</Text>
              <Text style={styles.detailValue}>{payment.patientId.name}</Text>
            </View>
          </View>
        </View>

        {/* Payment Details */}
        {payment.paymentDetails && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Payment Information</Text>
            <View style={styles.detailCard}>
              {payment.paymentDetails.phoneNumber && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Phone Number:</Text>
                  <Text style={styles.detailValue}>
                    {payment.paymentDetails.phoneNumber}
                  </Text>
                </View>
              )}
              {payment.paymentDetails.accountNumber && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Account Number:</Text>
                  <Text style={styles.detailValue}>
                    {payment.paymentDetails.accountNumber}
                  </Text>
                </View>
              )}
              {payment.paymentDetails.bankName && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Bank:</Text>
                  <Text style={styles.detailValue}>
                    {payment.paymentDetails.bankName}
                  </Text>
                </View>
              )}
              {payment.paymentDetails.referenceNumber && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Reference Number:</Text>
                  <Text style={styles.detailValue}>
                    {payment.paymentDetails.referenceNumber}
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Notes */}
        {payment.notes && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notes</Text>
            <View style={styles.detailCard}>
              <Text style={styles.notesText}>{payment.notes}</Text>
            </View>
          </View>
        )}

        {/* Action Buttons */}
        {user?.role === 'patient' && payment.status === 'pending' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Actions</Text>
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[styles.actionButton, styles.completeButton]}
                onPress={() => handleUpdateStatus('completed')}
              >
                <Text style={styles.actionButtonText}>Mark as Completed</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.cancelButton]}
                onPress={() => handleUpdateStatus('cancelled')}
              >
                <Text style={styles.actionButtonText}>Cancel Payment</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#e74c3c',
  },
  statusCard: {
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
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  statusActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 15,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#e1e8ed',
    gap: 8,
  },
  statusButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 2,
  },
  statusButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  completeButton: {
    backgroundColor: '#27ae60',
  },
  failButton: {
    backgroundColor: '#e74c3c',
  },
  cancelButton: {
    backgroundColor: '#e74c3c',
  },
  completedMessage: {
    backgroundColor: '#e8f5e9',
    padding: 15,
    borderRadius: 8,
    marginTop: 15,
    alignItems: 'center',
  },
  completedText: {
    color: '#27ae60',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  cancelledMessage: {
    backgroundColor: '#fdecea',
    padding: 15,
    borderRadius: 8,
    marginTop: 15,
    alignItems: 'center',
  },
  cancelledText: {
    color: '#e74c3c',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 12,
  },
  detailCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f2f6',
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7f8c8d',
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    color: '#2c3e50',
    flex: 2,
    textAlign: 'right',
  },
  amountValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#27ae60',
    flex: 2,
    textAlign: 'right',
  },
  notesText: {
    fontSize: 14,
    color: '#2c3e50',
    fontStyle: 'italic',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
}); 