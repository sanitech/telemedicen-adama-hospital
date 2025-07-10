import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  Alert,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../store/authStore';
import { appointmentsAPI } from '../../services/api';

interface Appointment {
  _id: string;
  dateTime: string;
  status: string;
  patientId: { name: string; email: string; _id: string };
  doctorId: { name: string; email: string; specialty: string; _id: string };
  note?: string;
  paid?: boolean;
}

export default function ConsultationsScreen() {
  const { user } = useAuthStore();
  const router = useRouter();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadAppointments = async () => {
    try {
      setLoading(true);
      const response = await appointmentsAPI.getMyAppointments();
      setAppointments(response.data || []);
    } catch (error: any) {
      console.error('Error loading appointments:', error);
      if (error.response?.status === 401) {
        Alert.alert('Authentication Error', 'Please log in again.');
      } else {
        Alert.alert('Error', `Failed to load consultations: ${error.response?.data?.message || error.message}`);
      }
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAppointments();
    setRefreshing(false);
  };

  useEffect(() => {
    if (user) {
      loadAppointments();
    }
  }, [user]);

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return '#f39c12';
      case 'confirmed':
        return '#3498db';
      case 'paid':
        return '#27ae60';
      case 'consultation':
        return '#9b59b6';
      case 'completed':
        return '#2ecc71';
      case 'cancelled':
        return '#e74c3c';
      default:
        return '#7f8c8d';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Pending';
      case 'confirmed':
        return 'Confirmed';
      case 'paid':
        return 'Paid';
      case 'consultation':
        return 'In Consultation';
      case 'completed':
        return 'Completed';
      case 'cancelled':
        return 'Cancelled';
      default:
        return status;
    }
  };

  const getOtherUserName = (appointment: Appointment) => {
    if (user?.role === 'patient') {
      return `Dr. ${appointment.doctorId.name}`;
    } else {
      return appointment.patientId.name;
    }
  };

  const getOtherUserInfo = (appointment: Appointment) => {
    if (user?.role === 'patient') {
      return appointment.doctorId.specialty;
    } else {
      return 'Patient';
    }
  };

  const handleAppointmentPress = (appointment: Appointment) => {
    if (appointment.status === 'consultation' || appointment.status === 'completed') {
      // Navigate to consultation screen
      router.push(`/consultation?appointmentId=${appointment._id}`);
    } else if (appointment.status === 'paid') {
      // For doctors, they can start consultation
      if (user?.role === 'doctor') {
        router.push(`/consultation?appointmentId=${appointment._id}`);
      } else {
        Alert.alert('Consultation', 'Waiting for doctor to start consultation');
      }
    } else {
      Alert.alert('Appointment', `Status: ${getStatusText(appointment.status)}`);
    }
  };

  const renderAppointment = ({ item }: { item: Appointment }) => {
    const otherUserName = getOtherUserName(item);
    const otherUserInfo = getOtherUserInfo(item);
    const statusColor = getStatusColor(item.status);
    const statusText = getStatusText(item.status);
    
    return (
      <TouchableOpacity
        style={styles.appointmentCard}
        onPress={() => handleAppointmentPress(item)}
      >
        <View style={styles.appointmentHeader}>
          <View style={styles.userInfo}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {otherUserName.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.userDetails}>
              <Text style={styles.userName}>{otherUserName}</Text>
              <Text style={styles.userInfoText}>{otherUserInfo}</Text>
            </View>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
            <Text style={styles.statusText}>{statusText}</Text>
          </View>
        </View>
        
        <View style={styles.appointmentDetails}>
          <Text style={styles.dateTimeText}>
            📅 {formatDateTime(item.dateTime)}
          </Text>
          {item.note && (
            <Text style={styles.noteText} numberOfLines={2}>
              📝 {item.note}
            </Text>
          )}
        </View>

        <View style={styles.actionButtons}>
          {(item.status === 'consultation' || item.status === 'completed') && (
            <TouchableOpacity
              style={styles.viewButton}
              onPress={() => router.push(`/consultation?appointmentId=${item._id}`)}
            >
              <Text style={styles.viewButtonText}>
                {item.status === 'consultation' ? 'Continue Consultation' : 'View Details'}
              </Text>
            </TouchableOpacity>
          )}
          {item.status === 'paid' && user?.role === 'doctor' && (
            <TouchableOpacity
              style={styles.startButton}
              onPress={() => router.push(`/consultation?appointmentId=${item._id}`)}
            >
              <Text style={styles.startButtonText}>Start Consultation</Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const filterAppointments = () => {
    // Show appointments that are relevant for consultations
    return appointments.filter(appointment => 
      ['confirmed', 'paid', 'consultation', 'completed'].includes(appointment.status)
    );
  };

  const filteredAppointments = filterAppointments();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Consultations</Text>
        <TouchableOpacity
          style={styles.newAppointmentButton}
          onPress={() => {
            router.push('/(tabs)/appointments');
          }}
        >
          <Text style={styles.newAppointmentButtonText}>Book Appointment</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={filteredAppointments}
        renderItem={renderAppointment}
        keyExtractor={(item) => item._id}
        style={styles.appointmentList}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No consultations yet</Text>
            <Text style={styles.emptyStateSubtext}>
              {user?.role === 'patient' 
                ? 'Book an appointment to start a consultation'
                : 'Patients will appear here when they book appointments'
              }
            </Text>
            <TouchableOpacity
              style={styles.bookAppointmentButton}
              onPress={() => {
                router.push('/(tabs)/appointments');
              }}
            >
              <Text style={styles.bookAppointmentButtonText}>
                {user?.role === 'patient' ? 'Book Appointment' : 'View All Appointments'}
              </Text>
            </TouchableOpacity>
          </View>
        }
      />
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
  newAppointmentButton: {
    backgroundColor: '#3498db',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  newAppointmentButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  appointmentList: {
    flex: 1,
  },
  appointmentCard: {
    backgroundColor: 'white',
    margin: 10,
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
  appointmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#3498db',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 4,
  },
  userInfoText: {
    fontSize: 14,
    color: '#7f8c8d',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  appointmentDetails: {
    marginBottom: 12,
  },
  dateTimeText: {
    fontSize: 14,
    color: '#2c3e50',
    marginBottom: 8,
  },
  noteText: {
    fontSize: 14,
    color: '#7f8c8d',
    fontStyle: 'italic',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  viewButton: {
    backgroundColor: '#9b59b6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  viewButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
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
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#7f8c8d',
    textAlign: 'center',
    marginBottom: 20,
  },
  bookAppointmentButton: {
    backgroundColor: '#3498db',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  bookAppointmentButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
}); 