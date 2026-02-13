import React, { useState, useRef } from 'react';
import {
  StyleSheet,
  Alert,
  Image,
} from 'react-native';
import {
  Box,
  Text,
  VStack,
  HStack,
  Heading,
  Pressable,
  Spinner,
} from '@gluestack-ui/themed';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import Icon from '@expo/vector-icons/MaterialIcons';
import AddExpenseModal from '../components/AddExpenseModal';
import { StorageService } from '../services/StorageService';
import OCRService from '../services/OCRService';
import GeminiService from '../services/GeminiService';
import ImageStorageService from '../services/ImageStorageService';
import { useThemeColors } from '../hooks/useThemeColors';

const CaptureScreen = ({ navigation }) => {
  const colors = useThemeColors();
  const [facing, setFacing] = useState('back');
  const [permission, requestPermission] = useCameraPermissions();
  const [capturedImage, setCapturedImage] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [categories, setCategories] = useState([]);
  const [ocrData, setOcrData] = useState(null);
  const [savedImageUri, setSavedImageUri] = useState(null);
  const [processingStage, setProcessingStage] = useState('');
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
      const categoriesData = await StorageService.getAllCategories();
      setCategories(categoriesData);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const takePicture = async () => {
    if (!cameraRef.current) {
      console.error('Camera ref not available');
      Alert.alert('Error', 'Camera not ready. Please try again.');
      return;
    }

    try {
      console.log('Taking picture...');
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: false,
        skipProcessing: false,
      });

      if (!photo || !photo.uri) {
        console.error('Photo capture returned invalid data:', photo);
        Alert.alert('Error', 'Failed to capture image. Please try again.');
        return;
      }

      console.log('Photo captured successfully:', photo.uri);
      setCapturedImage(photo);

      // Save image to persistent storage
      try {
        console.log('Saving image to persistent storage...');
        const permanentUri = await ImageStorageService.saveReceiptImage(photo.uri);
        console.log('Image saved successfully:', permanentUri);
        setSavedImageUri(permanentUri);
      } catch (saveError) {
        console.warn('Failed to save receipt image, using temporary URI:', saveError);
        setSavedImageUri(photo.uri);
      }
    } catch (error) {
      console.error('Error taking picture:', error);
      Alert.alert('Error', `Failed to take picture: ${error.message || 'Unknown error'}`);
    }
  };

  const pickImage = async () => {
    try {
      console.log('Launching image picker...');
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
        base64: false,
      });

      if (result.canceled) {
        console.log('Image picker canceled by user');
        return;
      }

      if (!result.assets || result.assets.length === 0) {
        console.error('No image selected');
        Alert.alert('Error', 'No image was selected. Please try again.');
        return;
      }

      const pickedImage = result.assets[0];
      if (!pickedImage || !pickedImage.uri) {
        console.error('Invalid image data:', pickedImage);
        Alert.alert('Error', 'Invalid image selected. Please try again.');
        return;
      }

      console.log('Image picked successfully:', pickedImage.uri);
      setCapturedImage(pickedImage);

      // Save image to persistent storage
      try {
        console.log('Saving picked image to persistent storage...');
        const permanentUri = await ImageStorageService.saveReceiptImage(pickedImage.uri);
        console.log('Image saved successfully:', permanentUri);
        setSavedImageUri(permanentUri);
      } catch (saveError) {
        console.warn('Failed to save receipt image, using temporary URI:', saveError);
        setSavedImageUri(pickedImage.uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', `Failed to pick image: ${error.message || 'Unknown error'}`);
    }
  };

  const retakePicture = () => {
    setCapturedImage(null);
    setSavedImageUri(null);
    setProcessingStage('');
  };

  const processImage = async () => {
    setIsProcessing(true);
    setOcrData(null);
    setProcessingStage('Analyzing receipt with AI...');

    const imageUri = savedImageUri || capturedImage.uri;

    try {
      // Primary: Try Gemini AI analysis
      setProcessingStage('AI Scanning...');
      const geminiResult = await GeminiService.analyzeReceipt(imageUri);

      if (geminiResult && !geminiResult.error) {
        const quality = GeminiService.getExtractionQuality(geminiResult);
        setOcrData(geminiResult);
        setProcessingStage('');

        if (quality.status === 'good') {
          setShowAddModal(true);
        } else if (quality.status === 'warning') {
          Alert.alert(
            'Partial Extraction',
            quality.message,
            [{ text: 'OK', onPress: () => setShowAddModal(true) }]
          );
        } else {
          Alert.alert(
            'Low Confidence',
            quality.message,
            [
              { text: 'Add Manually', onPress: () => setShowAddModal(true) },
              { text: 'Retry with OCR', onPress: () => fallbackToOCR(imageUri) },
            ]
          );
        }
        return;
      }

      // If Gemini returned rate limit error
      if (geminiResult?.error === 'rate_limited') {
        Alert.alert(
          'Rate Limited',
          geminiResult.message,
          [
            { text: 'Try OCR Instead', onPress: () => fallbackToOCR(imageUri) },
            { text: 'Add Manually', onPress: () => setShowAddModal(true) },
          ]
        );
        setIsProcessing(false);
        setProcessingStage('');
        return;
      }

      // Fallback: Try OCR if Gemini fails
      await fallbackToOCR(imageUri);
    } catch (error) {
      console.error('Processing error:', error);
      Alert.alert(
        'Processing Error',
        'An error occurred while processing the receipt. You can still add the expense manually.',
        [{ text: 'Add Manually', onPress: () => setShowAddModal(true) }]
      );
    } finally {
      setIsProcessing(false);
      setProcessingStage('');
    }
  };

  const fallbackToOCR = async (imageUri) => {
    setIsProcessing(true);
    setProcessingStage('Falling back to OCR...');
    try {
      const result = await OCRService.extractReceiptData(imageUri);
      if (result) {
        setOcrData(result);
        const quality = OCRService.getExtractionQuality(result);
        if (quality.status === 'warning') {
          Alert.alert(
            'Partial Extraction (OCR)',
            'Some fields could not be extracted. Please review and fill in missing details.',
            [{ text: 'OK', onPress: () => setShowAddModal(true) }]
          );
        } else {
          setShowAddModal(true);
        }
      } else {
        Alert.alert(
          'Could Not Read Receipt',
          'Unable to extract data from this image. You can still add the expense manually.',
          [{ text: 'Add Manually', onPress: () => setShowAddModal(true) }]
        );
      }
    } catch (error) {
      console.error('OCR fallback error:', error);
      Alert.alert(
        'Processing Error',
        'An error occurred while processing the receipt. You can still add the expense manually.',
        [{ text: 'Add Manually', onPress: () => setShowAddModal(true) }]
      );
    } finally {
      setIsProcessing(false);
      setProcessingStage('');
    }
  };

  const handleSaveExpense = async (expenseData) => {
    try {
      const receiptImagePath = savedImageUri || capturedImage.uri;
      const expenseWithImage = {
        ...expenseData,
        receiptImage: receiptImagePath,
        analysisSource: ocrData?.source || 'manual',
        analysisConfidence: ocrData?.confidence || null,
      };
      await StorageService.addExpense(expenseWithImage);
      setShowAddModal(false);
      setCapturedImage(null);
      setSavedImageUri(null);
      setOcrData(null);
      setProcessingStage('');
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
      <Box flex={1} justifyContent="center" alignItems="center" p="$8" bg={colors.white}>
        <Spinner size="large" color={colors.primary} />
        <Text color={colors.textSecondary} fontSize="$md" mt="$4">Requesting camera permission...</Text>
      </Box>
    );
  }

  if (!permission.granted) {
    return (
      <Box flex={1} justifyContent="center" alignItems="center" p="$8" bg={colors.white}>
        <Icon name="camera-alt" size={64} color={colors.textMuted} />
        <Text fontWeight="$semibold" fontSize="$xl" color={colors.text} mt="$4" mb="$2">No access to camera</Text>
        <Text fontSize="$md" color={colors.textSecondary} textAlign="center" mb="$6">
          Please enable camera access in your device settings to capture receipts.
        </Text>
        <Pressable onPress={requestPermission} bg={colors.primary} borderRadius="$lg" px="$6" py="$3">
          <Text color={colors.white} fontWeight="$semibold">Retry</Text>
        </Pressable>
      </Box>
    );
  }

  return (
    <Box flex={1} bg={colors.black}>
      {!capturedImage ? (
        // Camera View
        <Box flex={1}>
          <CameraView
            style={{ flex: 1 }}
            facing={facing}
            ref={cameraRef}
          />

          <Box position="absolute" top={0} left={0} right={0} bottom={0} justifyContent="space-between">
            <HStack justifyContent="flex-end" pt="$12" px="$5">
              <Pressable
                onPress={toggleCameraType}
                bg="rgba(0, 0, 0, 0.5)"
                borderRadius="$full"
                p="$2"
              >
                <Icon name="flip-camera-android" size={24} color={colors.white} />
              </Pressable>
            </HStack>

            <HStack justifyContent="space-between" alignItems="center" px="$8" pb="$10">
              <Pressable
                onPress={pickImage}
                bg="rgba(255, 255, 255, 0.2)"
                borderRadius="$full"
                p="$2"
              >
                <Icon name="photo-library" size={32} color={colors.white} />
              </Pressable>

              <Pressable onPress={takePicture}>
                <Box w={70} h={70} borderRadius="$full" bg="rgba(255, 255, 255, 0.9)" justifyContent="center" alignItems="center">
                  <Box w={60} h={60} borderRadius="$full" bg={colors.white} borderWidth={2} borderColor={colors.primary} />
                </Box>
              </Pressable>

              <Box w={40} />
            </HStack>
          </Box>

          <Box position="absolute" bottom={120} left={0} right={0} alignItems="center">
            <Text fontWeight="$semibold" fontSize="$lg" color={colors.white} mb="$1">Tap to Take Photo</Text>
            <Text fontSize="$sm" color="rgba(255, 255, 255, 0.8)">or select from gallery</Text>
          </Box>
        </Box>
      ) : (
        // Image Preview View
        <Box flex={1} bg={colors.white}>
          <HStack bg={colors.white} borderBottomWidth={1} borderBottomColor={colors.border} py="$3" px="$2" alignItems="center" justifyContent="space-between" pt="$12">
            <Pressable onPress={retakePicture} p="$2">
              <Icon name="close" size={24} color={colors.text} />
            </Pressable>
            <Text fontWeight="$semibold" fontSize="$lg" color={colors.text}>Review Receipt</Text>
            <Pressable onPress={processImage} p="$2">
              <Icon name="check" size={24} color={colors.primary} />
            </Pressable>
          </HStack>

          <Box flex={1} p="$4">
            <Image
              source={{ uri: capturedImage.uri }}
              style={{ width: '100%', height: 300, borderRadius: 12, marginBottom: 20 }}
              resizeMode="contain"
            />

            <Box bg={colors.backgroundSecondary} borderRadius="$xl" p="$6">
              {isProcessing ? (
                <VStack alignItems="center">
                  <Spinner size="large" color={colors.primary} />
                  <Text fontWeight="$semibold" fontSize="$lg" color={colors.text} mt="$4" mb="$1">Processing receipt...</Text>
                  <Text fontSize="$sm" color={colors.textSecondary} textAlign="center">
                    {processingStage || 'Extracting text and analyzing data'}
                  </Text>
                </VStack>
              ) : ocrData ? (
                <VStack alignItems="center">
                  <Icon name="check-circle" size={48} color={colors.success} />
                  <Text fontWeight="$semibold" fontSize="$lg" color={colors.text} mt="$4" mb="$1">Receipt processed!</Text>
                  {/* Source badge */}
                  <Box bg={ocrData.source === 'gemini_ai' ? colors.info : colors.primaryLight} borderRadius="$full" px="$3" py="$1" mb="$2">
                    <Text fontSize="$xs" color={colors.white} fontWeight="$semibold">
                      {ocrData.source === 'gemini_ai' ? 'AI' : ocrData.source === 'google_cloud_vision' ? 'Cloud Vision' : 'OCR'}
                    </Text>
                  </Box>
                  {ocrData.confidence !== null && ocrData.confidence !== undefined && (
                    <Text fontSize="$xs" color={colors.textMuted} mb="$2">
                      Confidence: {Math.round((ocrData.confidence || 0) * 100)}%
                    </Text>
                  )}
                  {ocrData.vendor ? (
                    <Text fontSize="$md" color={colors.text} mt="$1">Vendor: {ocrData.vendor}</Text>
                  ) : null}
                  {ocrData.amount ? (
                    <Text fontSize="$md" color={colors.text} mt="$1">Amount: ${ocrData.amount.toFixed(2)}</Text>
                  ) : null}
                  {ocrData.date ? (
                    <Text fontSize="$md" color={colors.text} mt="$1">Date: {ocrData.date}</Text>
                  ) : null}
                  {ocrData.items && ocrData.items.length > 0 && (
                    <Text fontSize="$sm" color={colors.textSecondary} mt="$2">
                      {ocrData.items.length} item{ocrData.items.length !== 1 ? 's' : ''} detected
                    </Text>
                  )}
                  <Pressable
                    onPress={() => setShowAddModal(true)}
                    bg={colors.primary}
                    borderRadius="$lg"
                    px="$6"
                    py="$3"
                    mt="$4"
                  >
                    <Text color={colors.white} fontWeight="$semibold">Confirm & Add Expense</Text>
                  </Pressable>
                </VStack>
              ) : (
                <VStack alignItems="center">
                  <Icon name="document-scanner" size={48} color={colors.primary} />
                  <Text fontWeight="$semibold" fontSize="$lg" color={colors.text} mt="$4" mb="$1">Ready to scan</Text>
                  <Text fontSize="$sm" color={colors.textSecondary} textAlign="center" mb="$2">
                    Tap the checkmark above to process this receipt
                  </Text>
                  <Text fontSize="$xs" color={colors.textMuted} textAlign="center" mb="$3">
                    Powered by Gemini AI with OCR fallback
                  </Text>
                  {savedImageUri && (
                    <HStack alignItems="center" mt="$1">
                      <Icon name="save" size={14} color={colors.success} />
                      <Text fontSize="$xs" color={colors.success} ml="$1">Image saved</Text>
                    </HStack>
                  )}
                </VStack>
              )}
            </Box>
          </Box>
        </Box>
      )}

      {/* Add Expense Modal */}
      {showAddModal && (
        <AddExpenseModal
          onClose={() => {
            setShowAddModal(false);
            setOcrData(null);
          }}
          onSave={handleSaveExpense}
          categories={categories}
          initialData={ocrData}
          receiptImageUri={savedImageUri || capturedImage?.uri}
        />
      )}
    </Box>
  );
};

export default CaptureScreen;
