import { useState, useEffect, useRef } from "react";
import { View, Alert, ActivityIndicator, Text, ScrollView, TouchableOpacity, Animated } from 'react-native';
import { useAudioRecorder, AudioModule, RecordingPresets, setAudioModeAsync, useAudioRecorderState } from 'expo-audio';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as LocalAuthentication from 'expo-local-authentication';
import { supabase } from '../lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Reanimated, { FadeIn, FadeOut } from 'react-native-reanimated';

export default function Index() {
    const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
    const recorderState = useAudioRecorderState(audioRecorder);
    const [screenState, setScreenState] = useState<'idle' | 'recording' | 'processing' | 'result'>('idle');
    const [essay, setEssay] = useState('');
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const insets = useSafeAreaInsets();
    const [isUnlocked, setIsUnlocked] = useState(false);
    const router = useRouter();

    const authenticate = async () => {
        const hasHardware = await LocalAuthentication.hasHardwareAsync();
        const isEnrolled = await LocalAuthentication.isEnrolledAsync();

        if (!hasHardware || !isEnrolled) {
            Alert.alert('Biometric auth not set up on this device.');
            setIsUnlocked(true);
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
                headers: { 'Content-Type': 'multipart/form-data' },
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
                playsInSilentMode: true,
                allowsRecording: true,
            });
        })();
    }, []);

    useEffect(() => {
        if (screenState === 'recording') {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, { toValue: 1.15, duration: 700, useNativeDriver: true }),
                    Animated.timing(pulseAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
                ])
            ).start();
        } else {
            pulseAnim.setValue(1);
        }
    }, [screenState]);

    if (!isUnlocked) {
        return (
            <View className="flex-1 bg-background items-center justify-center gap-6">
                <Text className="text-textPrimary text-2xl font-semibold">🔒 Voice2Blog</Text>
                <TouchableOpacity
                    className="bg-accent rounded-full px-12 py-[18px] shadow-lg"
                    onPress={authenticate}
                >
                    <Text className="text-white text-[17px] font-semibold text-center">Unlock</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View className="flex-1 bg-background">
            <View
                className="absolute z-50 w-full px-5 flex-row justify-end items-center"
                style={{ top: insets.top + 8 }}
            >
                <TouchableOpacity
                    className="w-11 h-11 rounded-full bg-surface items-center justify-center shadow-sm"
                    onPress={() => {
                        console.log('Profile tapped');
                        router.push('/settings');
                    }}
                >
                    <Ionicons name="person" size={20} color="#a3a3a3" />
                </TouchableOpacity>
            </View>

            <View className="flex-1 items-center px-6 pt-24">
                {(screenState === 'idle' || screenState === 'recording') && (
                    <View className="items-center gap-4">
                        <View className="w-32 h-32 rounded-full bg-surface items-center justify-center">
                            <Ionicons
                                name="mic"
                                size={56}
                                color={screenState === 'recording' ? '#EF4444' : '#8B5CF6'}
                            />
                        </View>

                        {screenState === 'idle' && (
                            <Reanimated.View entering={FadeIn.duration(300)} exiting={FadeOut.duration(200)} className="items-center gap-4">
                                <Text className="text-textPrimary text-2xl font-bold">Voice2Blog</Text>
                                <Text className="text-textSecondary text-base text-center">
                                    Turn your spoken thoughts into a polished blog post
                                </Text>
                            </Reanimated.View>
                        )}

                        {screenState === 'recording' && (
                            <Reanimated.View entering={FadeIn.duration(300)} exiting={FadeOut.duration(200)}>
                                <Text className="text-textSecondary text-base">Listening...</Text>
                            </Reanimated.View>
                        )}
                    </View>
                )}

                {screenState === 'processing' && (
                    <Reanimated.View entering={FadeIn.duration(300)} className="items-center gap-4">
                        <ActivityIndicator size="large" color="#8B5CF6" />
                        <Text className="text-textSecondary text-[15px]">Generating your blog post...</Text>
                    </Reanimated.View>
                )}

                {screenState === 'result' && (
                    <ScrollView className="w-full" contentContainerStyle={{ paddingBottom: 20 }}>
                        <Text className="text-textPrimary text-[15px] leading-[23px] p-1 mb-5">{essay}</Text>
                    </ScrollView>
                )}
            </View>

            <View className="items-center gap-4" style={{ paddingBottom: insets.bottom + 90 }}>
                {(screenState === 'idle' || screenState === 'recording') && (
                    <>
                        <Animated.View style={{ transform: [{ scale: screenState === 'recording' ? pulseAnim : 1 }] }}>
                            <TouchableOpacity
                                className={`rounded-full px-12 py-[18px] shadow-lg ${
                                    screenState === 'recording' ? 'bg-accentAlt' : 'bg-accent'
                                }`}
                                onPress={screenState === 'recording' ? stopRecording : record}
                            >
                                <Text className="text-white text-[17px] font-semibold text-center">
                                    {screenState === 'recording' ? 'Stop & Send' : 'Start Recording'}
                                </Text>
                            </TouchableOpacity>
                        </Animated.View>

                        <TouchableOpacity
                            className={`border-[1.5px] border-neutral-600 rounded-full px-10 py-[14px] ${
                                screenState !== 'recording' ? 'opacity-0' : ''
                            }`}
                            onPress={discard}
                            disabled={screenState !== 'recording'}
                        >
                            <Text className="text-textSecondary text-[15px] font-medium text-center">Discard</Text>
                        </TouchableOpacity>
                    </>
                )}

                {screenState === 'result' && (
                    <TouchableOpacity
                        className="bg-accent rounded-full px-12 py-[18px] shadow-lg"
                        onPress={() => setScreenState('idle')}
                    >
                        <Text className="text-white text-[17px] font-semibold text-center">New Recording</Text>
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
}