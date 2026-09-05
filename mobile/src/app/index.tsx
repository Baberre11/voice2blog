import {useState, useEffect, useRef} from "react";
import {View, StyleSheet, Button, Alert, ActivityIndicator, Text, ScrollView, TouchableOpacity, Animated} from 'react-native';
import {useAudioRecorder, AudioModule, RecordingPresets, setAudioModeAsync,useAudioRecorderState, } from 'expo-audio'
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as LocalAuthentication from 'expo-local-authentication';


export default function Index() {
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(audioRecorder);
  const [screenState, setScreenState] = useState<'idle' | 'recording' | 'processing' | 'result'>('idle');
  const [essay, setEssay] = useState('');
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const insets = useSafeAreaInsets();
  const [isUnlocked, setIsUnlocked] = useState(false);

  const authenticate = async () => {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();

        if (!hasHardware || !isEnrolled) {
            Alert.alert('Biometric auth not set up on this device.');
            setIsUnlocked(true); // fallback: don't lock out users with no Face ID/Touch ID configured
            return;
        }

        const result = await LocalAuthentication.authenticateAsync({
            promptMessage: 'Unlock Voice2Blog',
            fallbackLabel: 'Use passcode',
        });

        if (result.success) {
            setIsUnlocked(true);
        }
    };

    useEffect(() => {
        authenticate();
    }, []);

  const record = async () => {
    await audioRecorder.prepareToRecordAsync();
    audioRecorder.record();
    setScreenState('recording');

  };

  const stopRecording = async () => {
    await audioRecorder.stop();
    const uri = audioRecorder.uri;
    console.log('Recording saved at:', uri);

    if (!uri) {
      Alert.alert('No recording found.');
      setScreenState('idle');
      return;
    }

    setScreenState('processing');

    const fileResponse = await fetch(uri);
    const blob = await fileResponse.blob();

    const formData = new FormData();
    formData.append('audio', blob, 'recording.m4a');


    try {
      const response = await fetch('http://192.168.1.5:5050/api/voice-to-blog', {
        method: 'POST',
        body: formData,
        headers: {'Content-Type': 'multipart/form-data'},
      });

      const data = await response.json();
      setEssay(data.essay);
      setScreenState('result');
    } catch (error) {
      console.error('Upload error:', error);
      Alert.alert('Failed to generate blog post. Check your connection.');
      setScreenState('idle');
    }
  };

  const discard = async () => {
    if (recorderState.isRecording) {
      await audioRecorder.stop();
    }
    setScreenState('idle');
  };

  useEffect(() => {
    (async () => {
      const status = await AudioModule.requestRecordingPermissionsAsync();
      if (!status.granted) {
        Alert.alert('Permission denied for recorder');
      }
      setAudioModeAsync({
        playsInSilentMode: true, allowsRecording: true,
      });
    })();
  }, []);


  useEffect(() => {
    if (screenState === 'recording') {
      Animated.loop(
          Animated.sequence([
            Animated.timing(pulseAnim, {
              toValue: 1.15,
              duration: 700,
              useNativeDriver: true,
            }),
            Animated.timing(pulseAnim, {
              toValue: 1,
              duration: 700,
              useNativeDriver: true,
            }),
          ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [screenState]);

    if (!isUnlocked) {
        return (
            <View style={styles.lockContainer}>
                <Text style={styles.lockTitle}>🔒 Voice2Blog</Text>
                <TouchableOpacity style={styles.pillButton} onPress={authenticate}>
                    <Text style={styles.pillButtonText}>Unlock</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.contentArea}>
                {screenState === 'processing' && (
                    <>
                        <ActivityIndicator size="large" color="#8B5CF6" />
                        <Text style={styles.label}>Generating your blog post...</Text>
                    </>
                )}

                {screenState === 'result' && (
                    <ScrollView style={styles.resultScroll} contentContainerStyle={styles.resultScrollContent}>
                        <Text style={styles.essayText}>{essay}</Text>
                    </ScrollView>
                )}
            </View>

            <View style={[styles.actionArea, { paddingBottom: insets.bottom + 90 }]}>
                {(screenState === 'idle' || screenState === 'recording') && (
                    <>
                        <Animated.View style={{ transform: [{ scale: screenState === 'recording' ? pulseAnim : 1 }] }}>
                            <TouchableOpacity
                                style={[styles.pillButton, screenState === 'recording' && styles.pillButtonRecording]}
                                onPress={screenState === 'recording' ? stopRecording : record}
                            >
                                <Text style={styles.pillButtonText}>
                                    {screenState === 'recording' ? 'Stop & Send' : 'Start Recording'}
                                </Text>
                            </TouchableOpacity>
                        </Animated.View>

                        <TouchableOpacity
                            style={[styles.discardButton, screenState !== 'recording' && styles.hidden]}
                            onPress={discard}
                            disabled={screenState !== 'recording'}
                        >
                            <Text style={styles.discardButtonText}>Discard</Text>
                        </TouchableOpacity>
                    </>
                )}

                {screenState === 'result' && (
                    <TouchableOpacity style={styles.pillButton} onPress={() => setScreenState('idle')}>
                        <Text style={styles.pillButtonText}>New Recording</Text>
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
}
const styles = StyleSheet.create({

    container: {
      flex: 1,
      backgroundColor: '#0d0d0d',
    },
    lockContainer: {
        flex: 1,
        backgroundColor: '#0d0d0d',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 24,
    },
    lockTitle: {
        color: '#fff',
        fontSize: 24,
        fontWeight: '600',
    },
    contentArea: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 24,
      paddingTop: 40,
    },
    hidden: {
        opacity: 0,
    },
    actionArea: {
      alignItems: 'center',
      gap: 16,
    },
    resultScroll: {
      width: '100%',
    },
    resultScrollContent: {
      paddingBottom: 20,
    },
    pillButton: {
      backgroundColor: '#8B5CF6',
      paddingVertical: 18,
      paddingHorizontal: 48,
      borderRadius: 999,
      shadowColor: '#8B5CF6',
      shadowOpacity: 0.4,
      shadowRadius: 12,
      shadowOffset: {width: 0, height: 4},
      elevation: 6,
    },
    pillButtonRecording: {
      backgroundColor: '#EF4444',
      shadowColor: '#EF4444',
    },
    pillButtonText: {
      color: '#fff',
      fontSize: 17,
      fontWeight: '600',
      textAlign: 'center',
    },
    discardText: {
      color: '#666',
      fontSize: 15,
      textDecorationLine: 'underline',
    },
    label: {
      color: '#aaa',
      fontSize: 15,
    },
    resultBox: {
      width: '100%',
    },
    essayText: {
      color: '#eee',
      fontSize: 15,
      lineHeight: 23,
      padding: 4,
      marginBottom: 20,
    },

    discardButton: {
        borderWidth: 1.5,
        borderColor: '#555',
        paddingVertical: 14,
        paddingHorizontal: 40,
        borderRadius: 999,
    },
    discardButtonText: {
        color: '#ccc',
        fontSize: 15,
        fontWeight: '500',
        textAlign: 'center',
    },
  });

