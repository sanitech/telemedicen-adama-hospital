import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Modal,
  TextInput,
  Platform,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../store/authStore';
import { appointmentsAPI, authAPI } from '../../services/api';

interface Appointment {
  _id: string;
  dateTime: string;
  status: string;
  patientId?: { name: string; email: string };
  doctorId?: { name: string; email: string; specialty: string };
  note?: string;
}

interface Doctor {
  _id: string;
  name: string;
  email: string;
  specialty: string;
}

export default function AppointmentsScreen() {
  const { user } = useAuthStore();
  const router = useRouter();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [previousAppointments, setPreviousAppointments] = useState<Appointment[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [filteredDoctors, setFilteredDoctors] = useState<Doctor[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showDoctorDropdown, setShowDoctorDropdown] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [doctorSearch, setDoctorSearch] = useState('');
  const [bookingData, setBookingData] = useState({
    doctorId: '',
    dateTime: '',
    note: '',
  });
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<Date | null>(null);

  const loadAppointments = async () => {
    try {
      const response = await appointmentsAPI.getMyAppointments();
      const newAppointments = response.data;
      
      // Check for status changes and show notifications
      if (previousAppointments.length > 0 && user?.role === 'patient') {
        newAppointments.forEach(newAppointment => {
          const previousAppointment = previousAppointments.find(
            prev => prev._id === newAppointment._id
          );
          
          if (previousAppointment && 
              previousAppointment.status === 'paid' && 
              newAppointment.status === 'consultation') {
            Alert.alert(
              'Consultation Started!',
              `Dr. ${newAppointment.doctorId?.name} has started your consultation. Click "Join Consultation" to begin.`,
              [
                {
                  text: 'Join Now',
                  onPress: () => router.push(`/consultation?appointmentId=${newAppointment._id}`)
                },
                {
                  text: 'Later',
                  style: 'cancel'
                }
              ]
            );
          }
        });
      }
      
      setPreviousAppointments(appointments);
      setAppointments(newAppointments);
    } catch (error) {
      console.error('Error loading appointments:', error);
    }
  };

  const loadDoctors = async () => {
    try {
      const response = await authAPI.listDoctors();
      setDoctors(response.data);
      setFilteredDoctors(response.data);
    } catch (error) {
      console.error('Error loading doctors:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadAppointments(), loadDoctors()]);
    setRefreshing(false);
  };

  useEffect(() => {
    loadAppointments();
    if (user?.role === 'patient') {
      loadDoctors();
    }
    
    // Set up polling to check for appointment status updates
    const interval = setInterval(() => {
      loadAppointments();
    }, 10000); // Check every 10 seconds

    return () => clearInterval(interval);
  }, []);

  // Filter doctors based on search
  useEffect(() => {
    if (doctorSearch.trim() === '') {
      setFilteredDoctors(doctors);
    } else {
      const filtered = doctors.filter(doctor =>
        doctor.name?.toLowerCase().includes(doctorSearch?.toLowerCase()) ||
        doctor.specialty?.toLowerCase().includes(doctorSearch?.toLowerCase())
      );
      setFilteredDoctors(filtered);
    }
  }, [doctorSearch, doctors]);

  const handleDoctorSelect = (doctor: Doctor) => {
    setBookingData({ ...bookingData, doctorId: doctor._id });
    setDoctorSearch(doctor.name);
    setShowDoctorDropdown(false);
  };

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    setShowDatePicker(false);
    updateDateTime();
  };

  const handleTimeSelect = (time: Date) => {
    setSelectedTime(time);
    setShowTimePicker(false);
    updateDateTime();
  };

  const updateDateTime = () => {
    if (selectedDate && selectedTime) {
      const combinedDateTime = new Date(selectedDate);
      combinedDateTime.setHours(selectedTime.getHours());
      combinedDateTime.setMinutes(selectedTime.getMinutes());
      
      if (combinedDateTime > new Date()) {
        setBookingData({ ...bookingData, dateTime: combinedDateTime.toISOString() });
      } else {
        Alert.alert('Error', 'Please select a future date and time');
      }
    }
  };

  const generateTimeSlots = () => {
    const slots = [];
    for (let hour = 8; hour <= 18; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const time = new Date();
        time.setHours(hour, minute, 0, 0);
        slots.push(time);
      }
    }
    return slots;
  };

  const generateDateSlots = () => {
    const dates = [];
    const today = new Date();
    for (let i = 1; i <= 30; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      dates.push(date);
    }
    return dates;
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const handleBookAppointment = async () => {
    if (!bookingData.doctorId || !bookingData.dateTime) {
      Alert.alert('Error', 'Please select a doctor and date/time');
      return;
    }

    try {
      await appointmentsAPI.bookAppointment(bookingData);
      setShowBookingModal(false);
      setBookingData({ doctorId: '', dateTime: '', note: '' });
      setSelectedDate(null);
      setSelectedTime(null);
      setDoctorSearch('');
      loadAppointments();
      Alert.alert('Success', 'Appointment booked successfully!');
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to book appointment');
    }
  };

  const handleUpdateStatus = async (appointmentId: string, status: string) => {
    try {
      await appointmentsAPI.updateAppointmentStatus(appointmentId, status);
      loadAppointments();
      Alert.alert('Success', 'Appointment status updated!');
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to update status');
    }
  };

  const formatAppointmentDate = (dateString: string) => {
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
      case 'confirmed':
        return '#27ae60';
      case 'pending':
        return '#f39c12';
      case 'paid':
        return '#9b59b6';
      case 'consultation':
        return '#e67e22';
      case 'completed':
        return '#3498db';
      case 'cancelled':
        return '#e74c3c';
      default:
        return '#7f8c8d';
    }
  };

  const isSentByMe = (message: any) => {
    // Handles both object and string senderId
    const senderId = typeof message.senderId === 'object' ? message.senderId._id : message.senderId;
    console.log('senderId:', senderId, 'user._id:', user?._id);
    return senderId === user?._id;
  };

  const renderAppointmentCard = (appointment: Appointment) => (
    <View key={appointment._id} style={styles.appointmentCard}>
      <View style={styles.appointmentHeader}>
        <Text style={styles.appointmentDate}>
          {formatAppointmentDate(appointment.dateTime)}
        </Text>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: getStatusColor(appointment.status) },
          ]}
        >
          <Text style={styles.statusText}>
            {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
          </Text>
        </View>
      </View>

      {user?.role === 'patient' && appointment.doctorId && (
        <>
          <Text style={styles.doctorName}>
            Dr. {appointment.doctorId.name}
          </Text>
          <Text style={styles.specialty}>
            {appointment.doctorId.specialty}
          </Text>
        </>
      )}

      {user?.role === 'doctor' && appointment.patientId && (
        <>
          <Text style={styles.patientName}>
            {appointment.patientId.name}
          </Text>
          <Text style={styles.patientEmail}>
            {appointment.patientId.email}
          </Text>
        </>
      )}

      {appointment.note && (
        <Text style={styles.note}>Note: {appointment.note}</Text>
      )}

      {user?.role === 'patient' && appointment.status === 'confirmed' && (
        <TouchableOpacity
          style={[styles.actionButton, styles.payButton]}
          onPress={() => router.push(`/payment?appointmentId=${appointment._id}`)}
        >
          <Text style={styles.actionButtonText}>Pay Now</Text>
        </TouchableOpacity>
      )}

      {user?.role === 'patient' && appointment.status === 'paid' && (
        <TouchableOpacity
          style={[styles.actionButton, styles.consultButton]}
          onPress={() => router.push(`/consultation?appointmentId=${appointment._id}`)}
        >
          <Text style={styles.actionButtonText}>Start Consultation</Text>
        </TouchableOpacity>
      )}

      {user?.role === 'patient' && appointment.status === 'consultation' && (
        <TouchableOpacity
          style={[styles.actionButton, styles.joinButton]}
          onPress={() => router.push(`/consultation?appointmentId=${appointment._id}`)}
        >
          <Text style={styles.actionButtonText}>Join Consultation</Text>
        </TouchableOpacity>
      )}

      {user?.role === 'doctor' && appointment.status === 'paid' && (
        <TouchableOpacity
          style={[styles.actionButton, styles.consultButton]}
          onPress={() => router.push(`/consultation?appointmentId=${appointment._id}`)}
        >
          <Text style={styles.actionButtonText}>Start Consultation</Text>
        </TouchableOpacity>
      )}

      {user?.role === 'doctor' && appointment.status === 'consultation' && (
        <TouchableOpacity
          style={[styles.actionButton, styles.joinButton]}
          onPress={() => router.push(`/consultation?appointmentId=${appointment._id}`)}
        >
          <Text style={styles.actionButtonText}>Continue Consultation</Text>
        </TouchableOpacity>
      )}

      {user?.role === 'doctor' && appointment.status === 'pending' && (
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, styles.confirmButton]}
            onPress={() => handleUpdateStatus(appointment._id, 'confirmed')}
          >
            <Text style={styles.actionButtonText}>Confirm</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.cancelButton]}
            onPress={() => handleUpdateStatus(appointment._id, 'cancelled')}
          >
            <Text style={styles.actionButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      )}

      {user?.role === 'doctor' && appointment.status === 'confirmed' && (
        <TouchableOpacity
          style={[styles.actionButton, styles.completeButton]}
          onPress={() => handleUpdateStatus(appointment._id, 'completed')}
        >
          <Text style={styles.actionButtonText}>Mark Complete</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Appointments</Text>
        {user?.role === 'patient' && (
          <TouchableOpacity
            style={styles.bookButton}
            onPress={() => setShowBookingModal(true)}
          >
            <Text style={styles.bookButtonText}>Book New</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {appointments.length > 0 ? (
          appointments.map(renderAppointmentCard)
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No appointments found</Text>
            {user?.role === 'patient' && (
              <TouchableOpacity
                style={styles.bookButton}
                onPress={() => setShowBookingModal(true)}
              >
                <Text style={styles.bookButtonText}>Book Your First Appointment</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </ScrollView>

      {/* Booking Modal */}
      <Modal
        visible={showBookingModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowBookingModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Book Appointment</Text>

            {/* Doctor Selection */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Select Doctor</Text>
              <View style={styles.searchContainer}>
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search doctors by name or specialty..."
                  value={doctorSearch}
                  onChangeText={setDoctorSearch}
                  onFocus={() => setShowDoctorDropdown(true)}
                />
                {showDoctorDropdown && (
                  <View style={styles.dropdownContainer}>
                    <FlatList
                      data={filteredDoctors}
                      keyExtractor={(item) => item._id}
                      renderItem={({ item }) => (
                        <TouchableOpacity
                          style={styles.doctorOption}
                          onPress={() => handleDoctorSelect(item)}
                        >
                          <Text style={styles.doctorOptionName}>Dr. {item.name}</Text>
                          <Text style={styles.doctorOptionSpecialty}>{item.specialty}</Text>
                        </TouchableOpacity>
                      )}
                      style={styles.dropdownList}
                    />
                  </View>
                )}
              </View>
            </View>

            {/* Date Selection */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Select Date</Text>
              <TouchableOpacity
                style={styles.dateTimeButton}
                onPress={() => setShowDatePicker(true)}
              >
                <Text style={styles.dateTimeButtonText}>
                  {selectedDate ? formatDate(selectedDate) : 'Choose Date'}
                </Text>
                <Text style={styles.dateTimeLabel}>Tap to select</Text>
              </TouchableOpacity>
            </View>

            {/* Time Selection */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Select Time</Text>
              <TouchableOpacity
                style={styles.dateTimeButton}
                onPress={() => setShowTimePicker(true)}
              >
                <Text style={styles.dateTimeButtonText}>
                  {selectedTime ? formatTime(selectedTime) : 'Choose Time'}
                </Text>
                <Text style={styles.dateTimeLabel}>Tap to select</Text>
              </TouchableOpacity>
            </View>
            
            {bookingData.dateTime && (
              <View style={styles.selectedDateTimeContainer}>
                <Text style={styles.selectedDateTime}>
                  Selected: {new Date(bookingData.dateTime).toLocaleString()}
                </Text>
              </View>
            )}

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Note (Optional)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Add a note about your appointment"
                value={bookingData.note}
                onChangeText={(text) => setBookingData({ ...bookingData, note: text })}
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelModalButton]}
                onPress={() => setShowBookingModal(false)}
              >
                <Text style={styles.cancelModalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmModalButton]}
                onPress={handleBookAppointment}
              >
                <Text style={styles.confirmModalButtonText}>Book Appointment</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Date Picker Modal */}
      <Modal
        visible={showDatePicker}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowDatePicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.pickerModalContent}>
            <Text style={styles.modalTitle}>Select Date</Text>
            <FlatList
              data={generateDateSlots()}
              keyExtractor={(item) => item.toISOString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.pickerOption}
                  onPress={() => handleDateSelect(item)}
                >
                  <Text style={styles.pickerOptionText}>{formatDate(item)}</Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity
              style={styles.pickerCancelButton}
              onPress={() => setShowDatePicker(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Time Picker Modal */}
      <Modal
        visible={showTimePicker}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowTimePicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.pickerModalContent}>
            <Text style={styles.modalTitle}>Select Time</Text>
            <FlatList
              data={generateTimeSlots()}
              keyExtractor={(item) => item.toISOString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.pickerOption}
                  onPress={() => handleTimeSelect(item)}
                >
                  <Text style={styles.pickerOptionText}>{formatTime(item)}</Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity
              style={styles.pickerCancelButton}
              onPress={() => setShowTimePicker(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
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
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  bookButton: {
    backgroundColor: '#3498db',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  bookButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
    padding: 20,
  },
  appointmentCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  appointmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  appointmentDate: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
  doctorName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 4,
  },
  patientName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 4,
  },
  specialty: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 8,
  },
  patientEmail: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 8,
  },
  note: {
    fontSize: 14,
    color: '#7f8c8d',
    fontStyle: 'italic',
    marginTop: 8,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  confirmButton: {
    backgroundColor: '#27ae60',
  },
  cancelButton: {
    backgroundColor: '#e74c3c',
  },
  completeButton: {
    backgroundColor: '#3498db',
    marginTop: 12,
  },
  payButton: {
    backgroundColor: '#27ae60',
    marginTop: 12,
  },
  consultButton: {
    backgroundColor: '#9b59b6',
    marginTop: 12,
  },
  joinButton: {
    backgroundColor: '#e67e22',
    marginTop: 12,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#7f8c8d',
    marginBottom: 20,
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
  searchContainer: {
    borderWidth: 1,
    borderColor: '#e1e8ed',
    borderRadius: 8,
    padding: 12,
  },
  searchInput: {
    fontSize: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e1e8ed',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  dropdownContainer: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#e1e8ed',
    borderRadius: 8,
    maxHeight: 200,
    zIndex: 1000,
  },
  doctorOption: {
    padding: 12,
    borderWidth: 1,
    borderColor: '#e1e8ed',
    borderRadius: 8,
    marginBottom: 8,
  },
  doctorOptionSelected: {
    backgroundColor: '#3498db',
    borderColor: '#3498db',
  },
  doctorOptionName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#2c3e50',
  },
  doctorOptionSpecialty: {
    fontSize: 14,
    color: '#7f8c8d',
    marginTop: 2,
  },
  dropdownList: {
    maxHeight: 200,
  },
  dateTimeContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  dateTimeButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e1e8ed',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#f8f9fa',
    alignItems: 'center',
  },
  dateTimeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
  },
  dateTimeLabel: {
    fontSize: 12,
    color: '#7f8c8d',
    marginTop: 4,
  },
  selectedDateTime: {
    fontSize: 14,
    color: '#3498db',
    marginTop: 8,
    textAlign: 'center',
    fontWeight: '500',
  },
  selectedDateTimeContainer: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginTop: 10,
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
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  pickerModalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
  },
  pickerOption: {
    padding: 12,
    borderWidth: 1,
    borderColor: '#e1e8ed',
    borderRadius: 8,
    marginBottom: 8,
  },
  pickerOptionText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#2c3e50',
  },
  pickerCancelButton: {
    backgroundColor: '#e74c3c',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
}); 