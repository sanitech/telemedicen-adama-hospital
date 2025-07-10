import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuthStore } from '../store/authStore';
import { appointmentsAPI, prescriptionsAPI } from '../services/api';

interface Appointment {
  _id: string;
  dateTime: string;
  status: string;
  patientId: { name: string; email: string; _id: string };
  doctorId: { name: string; email: string; specialty: string; _id: string };
  note?: string;
}

interface Medication {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
  quantity: string;
}

export default function CreatePrescriptionScreen() {
  const { user } = useAuthStore();
  const router = useRouter();
  const { appointmentId, edit } = useLocalSearchParams<{ appointmentId: string; edit?: string }>();
  
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [diagnosis, setDiagnosis] = useState('');
  const [instructions, setInstructions] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [notes, setNotes] = useState('');
  const [medications, setMedications] = useState<Medication[]>([
    {
      name: '',
      dosage: '',
      frequency: '',
      duration: '',
      instructions: '',
      quantity: '',
    }
  ]);
  const [isEditMode, setIsEditMode] = useState(false);
  const [existingPrescription, setExistingPrescription] = useState<any>(null);

  useEffect(() => {
    if (appointmentId) {
      loadAppointment();
      if (edit === 'true') {
        setIsEditMode(true);
        loadExistingPrescription();
      }
    }
  }, [appointmentId, edit]);

  const loadAppointment = async () => {
    try {
      const response = await appointmentsAPI.getAppointmentById(appointmentId);
      setAppointment(response.data);
    } catch (error) {
      console.error('Error loading appointment:', error);
      Alert.alert('Error', 'Failed to load appointment details');
    } finally {
      setLoading(false);
    }
  };

  const loadExistingPrescription = async () => {
    try {
      const response = await prescriptionsAPI.getPrescriptionByAppointment(appointmentId);
      setExistingPrescription(response.data);
      setDiagnosis(response.data.diagnosis);
      setInstructions(response.data.instructions || '');
      setFollowUpDate(response.data.followUpDate || '');
      setNotes(response.data.notes || '');
      setMedications(response.data.medications);
    } catch (error) {
      console.error('Error loading existing prescription:', error);
      Alert.alert('Error', 'Failed to load existing prescription');
    }
  };

  const addMedication = () => {
    setMedications([
      ...medications,
      {
        name: '',
        dosage: '',
        frequency: '',
        duration: '',
        instructions: '',
        quantity: '',
      }
    ]);
  };

  const removeMedication = (index: number) => {
    if (medications.length > 1) {
      setMedications(medications.filter((_, i) => i !== index));
    }
  };

  const updateMedication = (index: number, field: keyof Medication, value: string) => {
    const updatedMedications = [...medications];
    updatedMedications[index] = {
      ...updatedMedications[index],
      [field]: value
    };
    setMedications(updatedMedications);
  };

  const validateForm = () => {
    if (!diagnosis.trim()) {
      Alert.alert('Error', 'Please enter a diagnosis');
      return false;
    }

    const validMedications = medications.filter(med => 
      med.name.trim() && med.dosage.trim() && med.frequency.trim() && med.duration.trim()
    );

    if (validMedications.length === 0) {
      Alert.alert('Error', 'Please add at least one medication');
      return false;
    }

    return true;
  };

  const handleCreatePrescription = async () => {
    if (!validateForm()) return;

    setSaving(true);
    try {
      const validMedications = medications.filter(med => 
        med.name.trim() && med.dosage.trim() && med.frequency.trim() && med.duration.trim()
      );

      const prescriptionData = {
        appointmentId,
        diagnosis: diagnosis.trim(),
        medications: validMedications,
        instructions: instructions.trim(),
        followUpDate: followUpDate.trim() || undefined,
        notes: notes.trim(),
      };

      if (isEditMode && existingPrescription) {
        await prescriptionsAPI.updatePrescription(existingPrescription._id, prescriptionData);
        Alert.alert(
          'Success', 
          'Prescription updated successfully!',
          [
            {
              text: 'OK',
              onPress: () => router.back()
            }
          ]
        );
      } else {
        await prescriptionsAPI.createPrescription(prescriptionData);
        Alert.alert(
          'Success', 
          'Prescription created successfully!',
          [
            {
              text: 'OK',
              onPress: () => router.back()
            }
          ]
        );
      }
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to save prescription');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3498db" />
          <Text style={styles.loadingText}>Loading appointment details...</Text>
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
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>
          {isEditMode ? 'Edit Prescription' : 'Create E-Prescription'}
        </Text>
        <View style={{ width: 50 }} />
      </View>

      <ScrollView style={styles.content}>
        {/* Patient Info */}
        <View style={styles.patientCard}>
          <Text style={styles.sectionTitle}>Patient Information</Text>
          <Text style={styles.patientName}>{appointment.patientId.name}</Text>
          <Text style={styles.patientEmail}>{appointment.patientId.email}</Text>
        </View>

        {/* Diagnosis */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Diagnosis *</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Enter diagnosis..."
            value={diagnosis}
            onChangeText={setDiagnosis}
            multiline
            numberOfLines={3}
          />
        </View>

        {/* Medications */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Medications *</Text>
            <TouchableOpacity style={styles.addButton} onPress={addMedication}>
              <Text style={styles.addButtonText}>+ Add</Text>
            </TouchableOpacity>
          </View>

          {medications.map((medication, index) => (
            <View key={index} style={styles.medicationCard}>
              <View style={styles.medicationHeader}>
                <Text style={styles.medicationTitle}>Medication {index + 1}</Text>
                {medications.length > 1 && (
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => removeMedication(index)}
                  >
                    <Text style={styles.removeButtonText}>Remove</Text>
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.inputRow}>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Name *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Medication name"
                    value={medication.name}
                    onChangeText={(value) => updateMedication(index, 'name', value)}
                  />
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Dosage *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g., 500mg"
                    value={medication.dosage}
                    onChangeText={(value) => updateMedication(index, 'dosage', value)}
                  />
                </View>
              </View>

              <View style={styles.inputRow}>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Frequency *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g., Twice daily"
                    value={medication.frequency}
                    onChangeText={(value) => updateMedication(index, 'frequency', value)}
                  />
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Duration *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g., 7 days"
                    value={medication.duration}
                    onChangeText={(value) => updateMedication(index, 'duration', value)}
                  />
                </View>
              </View>

              <View style={styles.inputRow}>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Quantity</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g., 14 tablets"
                    value={medication.quantity}
                    onChangeText={(value) => updateMedication(index, 'quantity', value)}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Instructions</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Special instructions..."
                  value={medication.instructions}
                  onChangeText={(value) => updateMedication(index, 'instructions', value)}
                  multiline
                  numberOfLines={2}
                />
              </View>
            </View>
          ))}
        </View>

        {/* Instructions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>General Instructions</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="General instructions for the patient..."
            value={instructions}
            onChangeText={setInstructions}
            multiline
            numberOfLines={3}
          />
        </View>

        {/* Follow-up Date */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Follow-up Date</Text>
          <TextInput
            style={styles.input}
            placeholder="YYYY-MM-DD (optional)"
            value={followUpDate}
            onChangeText={setFollowUpDate}
          />
        </View>

        {/* Notes */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notes</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Additional notes..."
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
          />
        </View>

        {/* Create Button */}
        <TouchableOpacity
          style={[styles.createButton, saving && styles.createButtonDisabled]}
          onPress={handleCreatePrescription}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Text style={styles.createButtonText}>
              {isEditMode ? 'Update Prescription' : 'Create Prescription'}
            </Text>
          )}
        </TouchableOpacity>
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
  patientCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
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
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 8,
  },
  patientName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 4,
  },
  patientEmail: {
    fontSize: 14,
    color: '#7f8c8d',
  },
  addButton: {
    backgroundColor: '#27ae60',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  addButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  medicationCard: {
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
  medicationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  medicationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
  },
  removeButton: {
    backgroundColor: '#e74c3c',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  removeButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
  inputRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  inputGroup: {
    flex: 1,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e1e8ed',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  createButton: {
    backgroundColor: '#9b59b6',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 40,
  },
  createButtonDisabled: {
    backgroundColor: '#bdc3c7',
  },
  createButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
}); 