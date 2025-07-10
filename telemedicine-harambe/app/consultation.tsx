import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuthStore } from '../store/authStore';
import { appointmentsAPI, prescriptionsAPI, messagesAPI } from '../services/api';

interface Appointment {
  _id: string;
  dateTime: string;
  status: string;
  patientId: { name: string; email: string; _id: string };
  doctorId: { name: string; email: string; specialty: string; _id: string };
  note?: string;
}

interface Message {
  _id: string;
  senderId: { _id: string; name: string; email: string };
  receiverId: { _id: string; name: string; email: string };
  content: string;
  createdAt: string;
}

interface Prescription {
  _id: string;
  appointmentId: string;
  diagnosis: string;
  medications: Array<{
    name: string;
    dosage: string;
    frequency: string;
    duration: string;
    instructions?: string;
    quantity?: string;
  }>;
  instructions?: string;
  followUpDate?: string;
  notes?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export default function ConsultationScreen() {
  const { user } = useAuthStore();
  const router = useRouter();
  const { appointmentId } = useLocalSearchParams<{ appointmentId: string }>();
  
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showPrescriptionModal, setShowPrescriptionModal] = useState(false);
  const [showMyPrescriptionModal, setShowMyPrescriptionModal] = useState(false);
  const [consultationStarted, setConsultationStarted] = useState(false);
  const [prescription, setPrescription] = useState<Prescription | null>(null);
  const [prescriptionLoading, setPrescriptionLoading] = useState(false);
  
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (appointmentId) {
      loadAppointment();
      // Set up polling to check for status updates
      const interval = setInterval(() => {
        if (!consultationStarted) {
          loadAppointment();
        }
      }, 5000); // Check every 5 seconds

      return () => clearInterval(interval);
    }
  }, [appointmentId, consultationStarted]);

  const loadAppointment = async () => {
    try {
      const response = await appointmentsAPI.getAppointmentById(appointmentId);
      setAppointment(response.data);
      setConsultationStarted(response.data.status === 'consultation');
      loadMessages();
      if (user?.role === 'doctor' && response.data.status === 'paid') {
        // Doctor can start consultation
        setConsultationStarted(false);
      }
      // Check for prescription if consultation has started
      if (response.data.status === 'consultation' || response.data.status === 'completed') {
        checkForPrescription();
      }
    } catch (error) {
      console.error('Error loading appointment:', error);
      Alert.alert('Error', 'Failed to load appointment details');
    } finally {
      setLoading(false);
    }
  };

  const checkForPrescription = async () => {
    if (!appointmentId) return;
    
    setPrescriptionLoading(true);
    try {
      const response = await prescriptionsAPI.getPrescriptionByAppointment(appointmentId);
      setPrescription(response.data);
    } catch (error: any) {
      if (error.response?.status !== 404) {
        console.error('Error checking for prescription:', error);
      }
      setPrescription(null);
    } finally {
      setPrescriptionLoading(false);
    }
  };

  const loadMessages = async () => {
    if (!appointment) return;
    
    try {
      const otherUserId = user?.role === 'patient' 
        ? appointment.doctorId._id 
        : appointment.patientId._id;
      
      const response = await messagesAPI.getMessages(otherUserId);
      
      // Validate and clean message data
      const validMessages = response.data.map((message: any) => ({
        ...message,
        createdAt: message.createdAt || new Date().toISOString(),
        content: message.content || '',
        senderId: message.senderId || { _id: '', name: '', email: '' },
        receiverId: message.receiverId || { _id: '', name: '', email: '' }
      }));
      
      setMessages(validMessages);
      scrollToBottom();
    } catch (error) {
      console.error('Error loading messages:', error);
      // Set empty messages array instead of failing
      setMessages([]);
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !appointment) return;

    setSending(true);
    try {
      const receiverId = user?.role === 'patient' 
        ? appointment.doctorId._id 
        : appointment.patientId._id;

      await messagesAPI.sendMessage({
        receiverId,
        content: newMessage.trim()
      });
      setNewMessage('');
      loadMessages(); // Reload messages to show the new one
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const startConsultation = async () => {
    try {
      await prescriptionsAPI.startConsultation(appointmentId);
      setConsultationStarted(true);
      Alert.alert('Success', 'Consultation started!');
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to start consultation');
    }
  };

  const formatTime = (dateString: string) => {
    try {
      console.log('Formatting date:', dateString, 'Type:', typeof dateString);
      const date = new Date(dateString);
      
      // Check if the date is valid
      if (isNaN(date.getTime())) {
        console.log('Invalid date detected:', dateString);
        return 'Invalid time';
      }
      
      return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    } catch (error) {
      console.error('Error formatting time:', error, 'Date string:', dateString);
      return 'Invalid time';
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return 'Invalid date';
      }
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch (error) {
      return 'Invalid date';
    }
  };

  const isSentByMe = (message: any) => {
    // Handles both object and string senderId
    const senderId = typeof message.senderId === 'object' ? message.senderId._id : message.senderId;
    return senderId === user?._id;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3498db" />
          <Text style={styles.loadingText}>Loading consultation...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!appointment) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Appointment not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        style={styles.container} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backButton}>← Back</Text>
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle}>
              {user?.role === 'patient' 
                ? `Dr. ${appointment.doctorId.name}` 
                : appointment.patientId.name}
            </Text>
            <Text style={styles.headerSubtitle}>
              {user?.role === 'patient' 
                ? appointment.doctorId.specialty 
                : 'Patient'}
            </Text>
          </View>
          {user?.role === 'doctor' && !consultationStarted && appointment.status === 'paid' && (
            <TouchableOpacity
              style={styles.startButton}
              onPress={startConsultation}
            >
              <Text style={styles.startButtonText}>Start</Text>
            </TouchableOpacity>
          )}
          {user?.role === 'doctor' && consultationStarted && (
            <TouchableOpacity
              style={styles.prescriptionButton}
              onPress={() => {
                if (prescription) {
                  setShowMyPrescriptionModal(true);
                } else {
                  setShowPrescriptionModal(true);
                }
              }}
            >
              <Text style={styles.prescriptionButtonText}>
                {prescription ? 'View Prescription' : 'E-Prescription'}
              </Text>
            </TouchableOpacity>
          )}
          {user?.role === 'patient' && prescription && (
            <TouchableOpacity
              style={styles.myPrescriptionButton}
              onPress={() => setShowMyPrescriptionModal(true)}
            >
              <Text style={styles.myPrescriptionButtonText}>My Prescription</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Consultation Status */}
        {!consultationStarted && (
          <View style={styles.statusCard}>
            <Text style={styles.statusText}>
              {user?.role === 'patient' 
                ? 'Waiting for doctor to start consultation...' 
                : 'Click "Start" to begin consultation'}
            </Text>
          </View>
        )}

        {/* Messages */}
        {consultationStarted && (
          <ScrollView 
            ref={scrollViewRef}
            style={styles.messagesContainer}
            contentContainerStyle={styles.messagesContent}
          >
            {messages.length === 0 ? (
              <View style={styles.emptyMessagesContainer}>
                <Text style={styles.emptyMessagesText}>
                  No messages yet. Start the conversation!
                </Text>
              </View>
            ) : (
              messages.map((message) => {
                if (!message || !message._id || !message.content) {
                  return null;
                }
                const isMe = isSentByMe(message);
                let senderLabel = 'Me';
                if (!isMe && appointment) {
                  // If the sender is the doctor
                  const doctorId = typeof message.senderId === 'object' ? message.senderId._id : message.senderId;
                  if (doctorId === appointment.doctorId._id) {
                    senderLabel = `Dr ${appointment.doctorId.name}`;
                  } else {
                    senderLabel = appointment.patientId.name;
                  }
                }
                return (
                  <View
                    key={message._id}
                    style={[
                      styles.messageBubble,
                      isMe ? styles.sentMessage : styles.receivedMessage
                    ]}
                  >
                    <Text style={styles.senderLabel}>{senderLabel}</Text>
                    <Text style={[
                      isMe ? styles.sentMessageText : styles.receivedMessageText
                    ]}>
                      {message.content}
                    </Text>
                    <Text style={[
                      isMe ? styles.sentMessageTime : styles.receivedMessageTime
                    ]}>
                      {message.createdAt ? formatTime(message.createdAt) : 'Just now'}
                    </Text>
                  </View>
                );
              }).filter(Boolean)
            )}
          </ScrollView>
        )}

        {/* Message Input */}
        {consultationStarted && (
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.messageInput}
              placeholder="Type your message..."
              value={newMessage}
              onChangeText={setNewMessage}
              multiline
              maxLength={500}
            />
            <TouchableOpacity
              style={[styles.sendButton, !newMessage.trim() && styles.sendButtonDisabled]}
              onPress={sendMessage}
              disabled={!newMessage.trim() || sending}
            >
              {sending ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text style={styles.sendButtonText}>Send</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>

      {/* E-Prescription Modal */}
      <Modal
        visible={showPrescriptionModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowPrescriptionModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Create E-Prescription</Text>
            <Text style={styles.modalSubtitle}>
              Fill in the prescription details for {appointment.patientId.name}
            </Text>
            
            <TouchableOpacity
              style={styles.createPrescriptionButton}
              onPress={() => {
                setShowPrescriptionModal(false);
                router.push(`/create-prescription?appointmentId=${appointmentId}`);
              }}
            >
              <Text style={styles.createPrescriptionButtonText}>
                Create New Prescription
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setShowPrescriptionModal(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* My Prescription Modal */}
      <Modal
        visible={showMyPrescriptionModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowMyPrescriptionModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, styles.prescriptionModalContent]}>
            <Text style={styles.modalTitle}>
              {user?.role === 'doctor' ? 'Prescription Details' : 'My Prescription'}
            </Text>
            <Text style={styles.modalSubtitle}>
              {user?.role === 'doctor' 
                ? `Prescribed for ${appointment.patientId.name}`
                : `Prescribed by Dr. ${appointment.doctorId.name}`
              }
            </Text>
            
            <ScrollView style={styles.prescriptionScrollView}>
              {prescription && (
                <>
                  <View style={styles.prescriptionSection}>
                    <Text style={styles.prescriptionSectionTitle}>Diagnosis</Text>
                    <Text style={styles.prescriptionSectionContent}>
                      {prescription.diagnosis}
                    </Text>
                  </View>

                  <View style={styles.prescriptionSection}>
                    <Text style={styles.prescriptionSectionTitle}>Medications</Text>
                    {prescription.medications.map((medication, index) => (
                      <View key={index} style={styles.medicationItem}>
                        <Text style={styles.medicationName}>{medication.name}</Text>
                        <Text style={styles.medicationDetails}>
                          Dosage: {medication.dosage}
                        </Text>
                        <Text style={styles.medicationDetails}>
                          Frequency: {medication.frequency}
                        </Text>
                        <Text style={styles.medicationDetails}>
                          Duration: {medication.duration}
                        </Text>
                        {medication.quantity && (
                          <Text style={styles.medicationDetails}>
                            Quantity: {medication.quantity}
                          </Text>
                        )}
                        {medication.instructions && (
                          <Text style={styles.medicationDetails}>
                            Instructions: {medication.instructions}
                          </Text>
                        )}
                      </View>
                    ))}
                  </View>

                  {prescription.instructions && (
                    <View style={styles.prescriptionSection}>
                      <Text style={styles.prescriptionSectionTitle}>General Instructions</Text>
                      <Text style={styles.prescriptionSectionContent}>
                        {prescription.instructions}
                      </Text>
                    </View>
                  )}

                  {prescription.followUpDate && (
                    <View style={styles.prescriptionSection}>
                      <Text style={styles.prescriptionSectionTitle}>Follow-up Date</Text>
                      <Text style={styles.prescriptionSectionContent}>
                        {formatDate(prescription.followUpDate)}
                      </Text>
                    </View>
                  )}

                  {prescription.notes && (
                    <View style={styles.prescriptionSection}>
                      <Text style={styles.prescriptionSectionTitle}>Notes</Text>
                      <Text style={styles.prescriptionSectionContent}>
                        {prescription.notes}
                      </Text>
                    </View>
                  )}

                  <View style={styles.prescriptionSection}>
                    <Text style={styles.prescriptionSectionTitle}>Prescription Date</Text>
                    <Text style={styles.prescriptionSectionContent}>
                      {formatDate(prescription.createdAt)}
                    </Text>
                  </View>
                </>
              )}
            </ScrollView>

            <View style={styles.modalButtons}>
              {user?.role === 'doctor' && (
                <TouchableOpacity
                  style={[styles.modalButton, styles.editButton]}
                  onPress={() => {
                    setShowMyPrescriptionModal(false);
                    router.push(`/create-prescription?appointmentId=${appointmentId}&edit=true`);
                  }}
                >
                  <Text style={styles.editButtonText}>Edit Prescription</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowMyPrescriptionModal(false)}
              >
                <Text style={styles.cancelButtonText}>Close</Text>
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
    marginRight: 15,
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#7f8c8d',
  },
  startButton: {
    backgroundColor: '#27ae60',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  startButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  prescriptionButton: {
    backgroundColor: '#9b59b6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  prescriptionButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
  statusCard: {
    backgroundColor: '#fff3cd',
    borderColor: '#ffeaa7',
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
    margin: 20,
  },
  statusText: {
    fontSize: 16,
    color: '#856404',
    textAlign: 'center',
  },
  messagesContainer: {
    flex: 1,
    padding: 20,
  },
  messagesContent: {
    paddingBottom: 20,
    flexGrow: 1,
    justifyContent: 'flex-end',
  },
  messageBubble: {
    maxWidth: '80%',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 16,
    marginBottom: 8,
    alignSelf: 'flex-start',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sentMessage: {
    backgroundColor: '#3498db',
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
    marginLeft: 'auto',
    shadowColor: '#3498db',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  receivedMessage: {
    backgroundColor: '#ecf0f1',
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
    marginRight: 'auto',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  messageText: {
    fontSize: 16,
    color: '#2c3e50',
  },
  sentMessageText: {
    fontSize: 16,
    color: 'white',
  },
  receivedMessageText: {
    fontSize: 16,
    color: '#2c3e50',
  },
  messageTime: {
    fontSize: 12,
    color: '#7f8c8d',
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  sentMessageTime: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  receivedMessageTime: {
    fontSize: 12,
    color: '#7f8c8d',
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 20,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e1e8ed',
  },
  messageInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e1e8ed',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: '#3498db',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginLeft: 10,
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#bdc3c7',
  },
  sendButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
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
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 20,
    textAlign: 'center',
  },
  createPrescriptionButton: {
    backgroundColor: '#9b59b6',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  createPrescriptionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
  cancelButton: {
    backgroundColor: '#e1e8ed',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#2c3e50',
    fontSize: 16,
    fontWeight: '500',
  },
  emptyMessagesContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyMessagesText: {
    fontSize: 16,
    color: '#7f8c8d',
    textAlign: 'center',
  },
  senderLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 2,
    color: '#888',
    textAlign: 'left',
  },
  myPrescriptionButton: {
    backgroundColor: '#9b59b6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  myPrescriptionButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
  prescriptionModalContent: {
    maxHeight: '80%',
    width: '95%',
  },
  prescriptionScrollView: {
    maxHeight: 300,
  },
  prescriptionSection: {
    marginBottom: 10,
  },
  prescriptionSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  prescriptionSectionContent: {
    fontSize: 14,
    color: '#2c3e50',
  },
  medicationItem: {
    marginBottom: 5,
  },
  medicationName: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  medicationDetails: {
    fontSize: 12,
    color: '#7f8c8d',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  modalButton: {
    backgroundColor: '#3498db',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  editButton: {
    backgroundColor: '#9b59b6',
  },
  editButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
}); 