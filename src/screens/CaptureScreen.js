import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Image,
  Modal,
} from 'react-native';
import {
  Button,
  Card,
  Portal,
  Appbar,
  ActivityIndicator,
} from 'react-native-paper';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import Icon from '@expo/vector-icons/MaterialIcons';
import AddExpenseModal from '../components/AddExpenseModal';
import { StorageService } from '../services/StorageService';

const CaptureScreen = ({ navigation }) => {
  const [facing, setFacing] = useState('back');
  const [permission, requestPermission] = useCameraPermissions();
  const [capturedImage, setCapturedImage] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [categories, setCategories] = useState([]);
  const cameraRef = useRef();

  React.useEffect(() => {
    loadCategories();
    
    return () => {
      if (cameraRef.current) {
        cameraRef.current = null;
      }
    };
  }, []);

  const loadCategories = async () => {
    try {
      const categoriesData = await StorageService.getCategories();
      setCategories(categoriesData);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const takePicture = async () => {
    if (cameraRef.current) {
      try {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.8,
          base64: false,
        });
        setCapturedImage(photo);
      } catch (error) {
        Alert.alert('Error', 'Failed to take picture');
      }
    }
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: [ImagePicker.MediaType.image],
        allowsEditing: true,
        quality: 0.8,
        base64: false,
      });

      if (!result.canceled) {
        setCapturedImage(result.assets[0]);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const retakePicture = () => {
    setCapturedImage(null);
  };

  const processImage = () => {
    setIsProcessing(true);
    // Simulate OCR processing
    setTimeout(() => {
      setIsProcessing(false);
      setShowAddModal(true);
    }, 2000);
  };

  const handleSaveExpense = async (expenseData) => {
    try {
      const expenseWithImage = {
        ...expenseData,
        receiptImage: capturedImage.uri,
      };
      await StorageService.addExpense(expenseWithImage);
      setShowAddModal(false);
      setCapturedImage(null);
      Alert.alert('Success', 'Expense added successfully!', [
        {
          text: 'OK',
          onPress: () => navigation.navigate('Expenses'),
        },
      ]);
    } catch (error) {
      Alert.alert('Error', 'Failed to save expense');
    }
  };

  const toggleCameraType = () => {
    setFacing(facing === 'back' ? 'front' : 'back');
  };

  if (!permission) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionText}>Requesting camera permission...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Icon name="camera-alt" size={64} color="#94a3b8" />
        <Text style={styles.permissionTitle}>No access to camera</Text>
        <Text style={styles.permissionText}>
          Please enable camera access in your device settings to capture receipts.
        </Text>
        <Button
          mode="contained"
          onPress={requestPermission}
          style={styles.retryButton}
        >
          Retry
        </Button>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {!capturedImage ? (
        // Camera View
        <View style={styles.cameraContainer}>
          <CameraView
            style={styles.camera}
            facing={facing}
            ref={cameraRef}
          />

          <View style={styles.cameraOverlay}>
            <View style={styles.topControls}>
              <TouchableOpacity
                style={styles.flipButton}
                onPress={toggleCameraType}
              >
                <Icon name="flip-camera-android" size={24} color="#ffffff" />
              </TouchableOpacity>
            </View>

            <View style={styles.bottomControls}>
              <TouchableOpacity
                style={styles.galleryButton}
                onPress={pickImage}
              >
                <Icon name="photo-library" size={32} color="#ffffff" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.captureButton}
                onPress={takePicture}
              >
                <View style={styles.captureButtonInner} />
              </TouchableOpacity>

              <View style={styles.placeholderButton} />
            </View>
          </View>

          <View style={styles.instructions}>
            <Text style={styles.instructionText}>Tap to Take Photo</Text>
            <Text style={styles.instructionSubtext}>or select from gallery</Text>
          </View>
        </View>
      ) : (
        // Image Preview View
        <View style={styles.previewContainer}>
          <Appbar.Header style={styles.previewHeader}>
            <Appbar.Action icon="close" onPress={retakePicture} />
            <Appbar.Content title="Review Receipt" />
            <Appbar.Action icon="check" onPress={processImage} />
          </Appbar.Header>

          <View style={styles.previewContent}>
            <Image
              source={{ uri: capturedImage.uri }}
              style={styles.previewImage}
              resizeMode="contain"
            />

            <Card style={styles.processingCard}>
              <Card.Content style={styles.processingContent}>
                {isProcessing ? (
                  <View style={styles.processingContainer}>
                    <ActivityIndicator size="large" color="#6366f1" />
                    <Text style={styles.processingText}>Processing receipt...</Text>
                    <Text style={styles.processingSubtext}>
                      Extracting text and analyzing data
                    </Text>
                  </View>
                ) : (
                  <View style={styles.processedContainer}>
                    <Icon name="check-circle" size={48} color="#10b981" />
                    <Text style={styles.processedText}>Receipt processed!</Text>
                    <Text style={styles.processedSubtext}>
                      Ready to add expense details
                    </Text>
                    <Button
                      mode="contained"
                      onPress={() => setShowAddModal(true)}
                      style={styles.addExpenseButton}
                    >
                      Add Expense Details
                    </Button>
                  </View>
                )}
              </Card.Content>
            </Card>
          </View>
        </View>
      )}

      {/* Add Expense Modal */}
      <Portal>
        <Modal
          visible={showAddModal}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setShowAddModal(false)}
        >
          <AddExpenseModal
            onClose={() => setShowAddModal(false)}
            onSave={handleSaveExpense}
            categories={categories}
          />
        </Modal>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#ffffff',
  },
  permissionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1e293b',
    marginTop: 16,
    marginBottom: 8,
  },
  permissionText: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#6366f1',
  },
  cameraContainer: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
    justifyContent: 'space-between',
  },
  topControls: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingTop: 50,
    paddingHorizontal: 20,
  },
  flipButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    padding: 8,
  },
  bottomControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 30,
    paddingBottom: 40,
  },
  galleryButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 25,
    padding: 8,
  },
  captureButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#6366f1',
  },
  placeholderButton: {
    width: 40,
  },
  instructions: {
    position: 'absolute',
    bottom: 120,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  instructionText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
  },
  instructionSubtext: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  previewContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  previewHeader: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  previewContent: {
    flex: 1,
    padding: 16,
  },
  previewImage: {
    width: '100%',
    height: 300,
    borderRadius: 12,
    marginBottom: 20,
  },
  processingCard: {
    backgroundColor: '#f8fafc',
  },
  processingContent: {
    padding: 24,
  },
  processingContainer: {
    alignItems: 'center',
  },
  processingText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginTop: 16,
    marginBottom: 4,
  },
  processingSubtext: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
  },
  processedContainer: {
    alignItems: 'center',
  },
  processedText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginTop: 16,
    marginBottom: 4,
  },
  processedSubtext: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 20,
  },
  addExpenseButton: {
    backgroundColor: '#6366f1',
  },
});

export default CaptureScreen;
