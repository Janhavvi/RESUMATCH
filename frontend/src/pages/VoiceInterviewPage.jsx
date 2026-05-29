import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion } from 'motion/react';
import {
  AlertTriangle,
  BarChart3,
  CheckCircle,
  FileText,
  Gauge,
  Loader2,
  Mic,
  MicOff,
  Pause,
  Play,
  RefreshCcw,
  RotateCcw,
  ShieldAlert,
  SkipForward,
  StopCircle,
  Upload,
  Volume2,
  Waves,
} from 'lucide-react';
import { apiFetch } from '../lib/api.js';

const ROLE_OPTIONS = [
  'Teacher',
  'MERN Developer',
  'Frontend Developer',
  'Backend Developer',
  'Full Stack Developer',
  'Data Analyst',
  'Data Scientist',
  'AI Engineer',
  'Machine Learning Engineer',
  'Cybersecurity Analyst',
  'UI/UX Designer',
  'Product Manager',
  'HR',
  'Accountant',
  'Doctor',
  'Lawyer',
  'Marketing Specialist',
  'Sales Executive',
];

const INTERVIEW_TYPES = ['Resume Based', 'Technical', 'Behavioral', 'Project Based', 'System Design', 'HR', 'Final Round'];
const DIFFICULTIES = ['Beginner', 'Intermediate', 'Advanced', 'Strict Mode'];
const START_SESSION_TIMEOUT_MS = 12000;
const INITIAL_WAVE = Array.from({ length: 28 }, (_, index) => 18 + ((index * 7) % 38));
const TTS_BLOCKED_MESSAGE = 'Browser text-to-speech was blocked. Press Repeat once, or allow sound/autoplay for this site.';

const formatClock = (seconds) => {
  const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
  const secs = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${mins}:${secs}`;
};

const averageDimension = (rows, key) => {
  const values = rows.map((item) => Number(item?.dimensions?.[key])).filter(Number.isFinite);
  return values.length ? Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(1)) : 0;
};

const verdictFor = (score) => {
  if (score >= 8.6) return 'Strong Hire';
  if (score >= 7.4) return 'Hire';
  if (score >= 6.2) return 'Borderline';
  if (score >= 4.8) return 'Needs Improvement';
  return 'Not Ready';
};

const normalizeSpeechText = (question) => (
  typeof question === 'string'
    ? question
    : String(question?.question || question?.text || '')
).trim();

export const VoiceInterviewPage = () => {
  const [sessionId, setSessionId] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [askedQuestions, setAskedQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [interviewState, setInterviewState] = useState('Thinking');
  const [permissionStatus, setPermissionStatus] = useState('checking');
  const [micStatus, setMicStatus] = useState('disconnected');
  const [speechSupport, setSpeechSupport] = useState('checking');
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [sessionSeconds, setSessionSeconds] = useState(0);
  const [waveform, setWaveform] = useState(INITIAL_WAVE);
  const [userAnswer, setUserAnswer] = useState('');
  const [recordingStatus, setRecordingStatus] = useState('Microphone check in progress');
  const [speechError, setSpeechError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [loading, setLoading] = useState(false);
  const [resumeFile, setResumeFile] = useState(null);
  const [resumeText, setResumeText] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [answerEvaluations, setAnswerEvaluations] = useState([]);
  const [interviewReport, setInterviewReport] = useState(null);
  const [interviewConfig, setInterviewConfig] = useState({
    role: 'MERN Developer',
    type: 'Resume Based',
    difficulty: 'Intermediate',
    strictMode: true,
  });

  const recognitionRef = useRef(null);
  const synthesisRef = useRef(null);
  const streamRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const waveformTimerRef = useRef(null);
  const recordingTimerRef = useRef(null);
  const sessionTimerRef = useRef(null);
  const baseTranscriptRef = useRef('');
  const finalTranscriptRef = useRef('');
  const interimTranscriptRef = useRef('');
  const desiredRecordingRef = useRef(false);
  const pausedRef = useRef(false);
  const retryCountRef = useRef(0);
  const heardSpeechRef = useRef(false);
  const selectedVoiceRef = useRef(null);
  const speechFallbackTimerRef = useRef(null);

  const currentQuestion = questions[currentQuestionIndex] || '';
  const strictModeEnabled = interviewConfig.strictMode || interviewConfig.difficulty === 'Strict Mode';

  const onDrop = useCallback((acceptedFiles) => {
    if (acceptedFiles.length > 0) {
      setResumeFile(acceptedFiles[0]);
      setResumeText('');
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt'],
    },
    multiple: false,
  });

  const cleanupAudio = useCallback(() => {
    if (waveformTimerRef.current) clearInterval(waveformTimerRef.current);
    waveformTimerRef.current = null;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => null);
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    setMicStatus('disconnected');
  }, []);

  const startWaveform = useCallback((stream) => {
    if (!stream || !window.AudioContext) return;
    if (waveformTimerRef.current) clearInterval(waveformTimerRef.current);
    audioContextRef.current = new window.AudioContext();
    analyserRef.current = audioContextRef.current.createAnalyser();
    analyserRef.current.fftSize = 128;
    audioContextRef.current.createMediaStreamSource(stream).connect(analyserRef.current);
    const data = new Uint8Array(analyserRef.current.frequencyBinCount);
    waveformTimerRef.current = setInterval(() => {
      analyserRef.current?.getByteFrequencyData(data);
      const bars = Array.from({ length: 28 }, (_, index) => {
        const value = data[(index * 2) % data.length] || 0;
        return Math.max(12, Math.min(88, Math.round((value / 255) * 86)));
      });
      setWaveform(bars);
    }, 100);
  }, []);

  const requestMicrophonePermission = useCallback(async () => {
    setPermissionStatus('checking');
    setRecordingStatus('Requesting microphone permission');
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        setPermissionStatus('unsupported');
        setMicStatus('disconnected');
        setSpeechError('This browser cannot access a microphone. Type your answer manually.');
        return null;
      }
      cleanupAudio();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      stream.getAudioTracks().forEach((track) => {
        track.onended = () => {
          setMicStatus('disconnected');
          setRecordingStatus('Microphone disconnected');
        };
      });
      setPermissionStatus('granted');
      setMicStatus(stream.getAudioTracks().some((track) => track.readyState === 'live') ? 'connected' : 'disconnected');
      setRecordingStatus('Microphone connected');
      startWaveform(stream);
      return stream;
    } catch (error) {
      setMicStatus('disconnected');
      if (error?.name === 'NotAllowedError' || error?.name === 'PermissionDeniedError') {
        setPermissionStatus('denied');
        setSpeechError('Microphone permission denied. Allow access or type your answer manually.');
      } else if (error?.name === 'NotFoundError') {
        setPermissionStatus('missing');
        setSpeechError('No microphone was found. Connect a microphone or type your answer manually.');
      } else {
        setPermissionStatus('error');
        setSpeechError('Microphone check failed. You can still type your answer manually.');
      }
      return null;
    }
  }, [cleanupAudio, startWaveform]);

  const buildTranscript = useCallback(() => {
    const parts = [
      baseTranscriptRef.current.trim(),
      finalTranscriptRef.current.trim(),
      interimTranscriptRef.current.trim(),
    ].filter(Boolean);
    setUserAnswer(parts.join(' ').replace(/\s+/g, ' '));
  }, []);

  const loadSpeechVoice = useCallback(() => {
    const synth = window.speechSynthesis;
    if (!synth) return null;
    const voices = synth.getVoices();
    const preferredVoice = voices.find((voice) => /^en/i.test(voice.lang) && /google|microsoft|zira|samantha|english/i.test(voice.name))
      || voices.find((voice) => /^en/i.test(voice.lang))
      || voices[0]
      || null;
    selectedVoiceRef.current = preferredVoice;
    return preferredVoice;
  }, []);

  const primeSpeechSynthesis = useCallback(() => {
    const synth = window.speechSynthesis;
    if (!synth || typeof SpeechSynthesisUtterance === 'undefined') {
      setSpeechError('Text-to-speech is not supported in this browser. You can still read the question on screen.');
      return false;
    }

    synthesisRef.current = synth;
    loadSpeechVoice();

    try {
      synth.cancel();
      if (synth.paused) synth.resume();
      const unlockUtterance = new SpeechSynthesisUtterance('Ready.');
      unlockUtterance.volume = 0.01;
      unlockUtterance.rate = 1;
      unlockUtterance.voice = selectedVoiceRef.current || null;
      synth.speak(unlockUtterance);
      return true;
    } catch {
      setSpeechError(TTS_BLOCKED_MESSAGE);
      return false;
    }
  }, [loadSpeechVoice]);

  const configureRecognition = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      recognitionRef.current = null;
      setSpeechSupport('unsupported');
      return;
    }

    setSpeechSupport('supported');
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsRecording(true);
      setIsPaused(false);
      setIsListening(true);
      setIsProcessing(false);
      setInterviewState('Listening');
      setRecordingStatus('Listening');
    };

    recognition.onspeechstart = () => {
      heardSpeechRef.current = true;
      setIsListening(true);
      setIsProcessing(false);
      setRecordingStatus('Listening');
      setSpeechError('');
    };

    recognition.onspeechend = () => {
      setIsListening(false);
      setIsProcessing(true);
      setInterviewState('Thinking');
      setRecordingStatus('Processing speech');
    };

    recognition.onresult = (event) => {
      let finalText = '';
      let interimText = '';
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const transcript = event.results[index][0].transcript;
        if (event.results[index].isFinal) finalText += `${transcript} `;
        else interimText += transcript;
      }
      if (finalText || interimText) {
        heardSpeechRef.current = true;
        retryCountRef.current = 0;
        setSpeechError('');
      }
      if (finalText) finalTranscriptRef.current = `${finalTranscriptRef.current} ${finalText}`.trim();
      interimTranscriptRef.current = interimText;
      buildTranscript();
    };

    recognition.onerror = (event) => {
      const retryable = ['no-speech', 'network', 'aborted'].includes(event.error);
      const blocked = ['not-allowed', 'service-not-allowed', 'audio-capture'].includes(event.error);
      const messages = {
        'not-allowed': 'Microphone permission denied. Type manually or allow microphone access.',
        'service-not-allowed': 'Speech recognition permission was blocked. Type manually or retry.',
        'no-speech': 'No speech was detected. I will retry once, or you can type manually.',
        'audio-capture': 'No microphone input was captured. Check your microphone connection.',
        network: 'Speech recognition had a network issue. I will retry automatically.',
        aborted: 'Recording was interrupted.',
      };
      setSpeechError(messages[event.error] || 'Speech recognition failed. Retry or type your answer manually.');
      setIsProcessing(false);
      if (blocked) {
        desiredRecordingRef.current = false;
        setIsRecording(false);
        setIsListening(false);
      }
      if (retryable && desiredRecordingRef.current && !pausedRef.current && retryCountRef.current < 2) {
        retryCountRef.current += 1;
        window.setTimeout(() => {
          try {
            recognition.start();
            setRecordingStatus(`Retrying speech recognition (${retryCountRef.current}/2)`);
          } catch {
            setIsRecording(false);
          }
        }, 650);
      }
    };

    recognition.onend = () => {
      setIsListening(false);
      setIsProcessing(false);
      interimTranscriptRef.current = '';
      buildTranscript();
      if (desiredRecordingRef.current && !pausedRef.current) {
        window.setTimeout(() => {
          try {
            recognition.start();
          } catch {
            setIsRecording(false);
          }
        }, 500);
        return;
      }
      setIsRecording(false);
      if (pausedRef.current) {
        setIsPaused(true);
        setRecordingStatus('Recording paused');
      } else {
        setRecordingStatus(heardSpeechRef.current ? 'Recording stopped' : 'No speech detected. Retry or type manually.');
      }
    };

    recognitionRef.current = recognition;
  }, [buildTranscript]);

  useEffect(() => {
    configureRecognition();
    synthesisRef.current = window.speechSynthesis;
    loadSpeechVoice();
    if (window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = loadSpeechVoice;
    }
    requestMicrophonePermission();
    return () => {
      desiredRecordingRef.current = false;
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      if (sessionTimerRef.current) clearInterval(sessionTimerRef.current);
      if (speechFallbackTimerRef.current) clearTimeout(speechFallbackTimerRef.current);
      if (recognitionRef.current) recognitionRef.current.abort();
      if (synthesisRef.current) synthesisRef.current.cancel();
      if (window.speechSynthesis) window.speechSynthesis.onvoiceschanged = null;
      cleanupAudio();
    };
  }, [cleanupAudio, configureRecognition, loadSpeechVoice, requestMicrophonePermission]);

  useEffect(() => {
    if (isRecording && !isPaused) {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = setInterval(() => setRecordingSeconds((value) => value + 1), 1000);
      return () => clearInterval(recordingTimerRef.current);
    }
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
  }, [isRecording, isPaused]);

  useEffect(() => {
    if (!sessionStarted || interviewReport) return undefined;
    if (sessionTimerRef.current) clearInterval(sessionTimerRef.current);
    sessionTimerRef.current = setInterval(() => setSessionSeconds((value) => value + 1), 1000);
    return () => clearInterval(sessionTimerRef.current);
  }, [sessionStarted, interviewReport]);

  const handleUploadResume = async () => {
    if (!resumeFile) return;
    setIsUploading(true);
    const formData = new FormData();
    formData.append('resume', resumeFile);
    try {
      const response = await apiFetch('/api/resume/upload', { method: 'POST', body: formData });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error || 'Upload failed. Please use PDF, DOCX, or TXT files.');
      if (!data?.text) throw new Error('Upload succeeded but no resume text was returned.');
      setResumeText(data.text);
      setResumeFile(null);
    } catch (error) {
      alert(error.message || 'Upload failed. Please try again.');
      setResumeFile(null);
    } finally {
      setIsUploading(false);
    }
  };

  const speakQuestion = (question) => new Promise((resolve) => {
    const text = normalizeSpeechText(question);
    const synth = window.speechSynthesis || synthesisRef.current;

    if (!text) return resolve(false);
    if (!synth || typeof SpeechSynthesisUtterance === 'undefined') {
      setSpeechError('Text-to-speech is not supported in this browser. You can still read the question on screen.');
      return resolve(false);
    }

    synthesisRef.current = synth;
    loadSpeechVoice();
    if (speechFallbackTimerRef.current) clearTimeout(speechFallbackTimerRef.current);

    let started = false;
    let settled = false;
    const settle = (value) => {
      if (settled) return;
      settled = true;
      if (speechFallbackTimerRef.current) clearTimeout(speechFallbackTimerRef.current);
      resolve(value);
    };

    synth.cancel();
    if (synth.paused) synth.resume();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.94;
    utterance.pitch = 0.88;
    utterance.volume = 1;
    utterance.voice = selectedVoiceRef.current || null;
    utterance.onstart = () => {
      started = true;
      setSpeechError('');
      setIsSpeaking(true);
      setInterviewState('Speaking');
    };
    utterance.onend = () => {
      setIsSpeaking(false);
      setInterviewState('Listening');
      settle(true);
    };
    utterance.onerror = (event) => {
      setIsSpeaking(false);
      setInterviewState('Listening');
      if (!['canceled', 'interrupted'].includes(event.error)) {
        setSpeechError(TTS_BLOCKED_MESSAGE);
      }
      settle(false);
    };
    synth.speak(utterance);

    speechFallbackTimerRef.current = setTimeout(() => {
      if (started || settled) return;
      try {
        synth.resume();
      } catch {
        // Some browsers throw when resume is unavailable.
      }
      window.setTimeout(() => {
        if (started || settled) return;
        setIsSpeaking(false);
        setInterviewState('Listening');
        setSpeechError(TTS_BLOCKED_MESSAGE);
        settle(false);
      }, 800);
    }, 1200);
  });

  const startSession = async () => {
    if (!resumeText.trim()) {
      alert('Please paste or upload your resume first.');
      return;
    }
    let timeoutId;
    try {
      primeSpeechSynthesis();
      setLoading(true);
      setInterviewState('Thinking');
      const controller = new AbortController();
      timeoutId = window.setTimeout(() => controller.abort(), START_SESSION_TIMEOUT_MS);
      const response = await apiFetch('/api/interviews/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resumeText, interviewConfig }),
        signal: controller.signal,
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error || 'Failed to start interview session');
      setSessionId(data.session.id);
      setQuestions(data.session.questions || []);
      setAskedQuestions(data.session.askedQuestions || data.session.questions || []);
      setAnswerEvaluations([]);
      setInterviewReport(null);
      setSessionStarted(true);
      setSessionSeconds(0);
      setCurrentQuestionIndex(0);
      setFeedback(null);
      setUserAnswer('');
      speakQuestion(data.session.questions?.[0]).catch(() => null);
    } catch (error) {
      alert(error.name === 'AbortError' ? 'Interview start timed out. Please try again.' : error.message || 'Failed to start interview session');
    } finally {
      if (timeoutId) window.clearTimeout(timeoutId);
      setLoading(false);
    }
  };

  const startRecognitionSafely = useCallback((failureMessage = 'Recording failed. Use retry or type manually.') => {
    const attemptStart = (rebuild = false) => {
      if (rebuild) configureRecognition();
      window.setTimeout(() => {
        try {
          recognitionRef.current?.start();
        } catch {
          if (!rebuild) {
            attemptStart(true);
            return;
          }
          desiredRecordingRef.current = false;
          pausedRef.current = false;
          setIsRecording(false);
          setIsPaused(false);
          setIsListening(false);
          setIsProcessing(false);
          setInterviewState('Thinking');
          setRecordingStatus('Ready');
          setSpeechError(failureMessage);
        }
      }, rebuild ? 450 : 250);
    };
    attemptStart(false);
  }, [configureRecognition]);

  const beginRecording = async ({ clear = false } = {}) => {
    if (speechSupport === 'unsupported' || !recognitionRef.current) {
      setSpeechError('Speech recognition is not supported in this browser. Type your answer manually.');
      return;
    }
    if (permissionStatus !== 'granted' || micStatus !== 'connected') {
      const stream = await requestMicrophonePermission();
      if (!stream) return;
    }
    if (clear) {
      setUserAnswer('');
      baseTranscriptRef.current = '';
    } else {
      baseTranscriptRef.current = userAnswer.trim();
    }
    finalTranscriptRef.current = '';
    interimTranscriptRef.current = '';
    desiredRecordingRef.current = true;
    pausedRef.current = false;
    retryCountRef.current = 0;
    heardSpeechRef.current = false;
    setFeedback(null);
    setSpeechError('');
    setRecordingSeconds(clear ? 0 : recordingSeconds);
    setRecordingStatus('Listening');
    startRecognitionSafely('Recording failed. Use retry or type manually.');
  };

  const stopRecording = () => {
    desiredRecordingRef.current = false;
    pausedRef.current = false;
    setIsPaused(false);
    setIsProcessing(true);
    setRecordingStatus('Processing speech');
    try {
      recognitionRef.current?.stop();
    } catch {
      setIsRecording(false);
      setIsProcessing(false);
    }
  };

  const pauseRecording = () => {
    desiredRecordingRef.current = false;
    pausedRef.current = true;
    setIsPaused(true);
    setRecordingStatus('Recording paused');
    try {
      recognitionRef.current?.stop();
    } catch {
      setIsRecording(false);
    }
  };

  const resumeRecording = () => {
    baseTranscriptRef.current = userAnswer.trim();
    finalTranscriptRef.current = '';
    interimTranscriptRef.current = '';
    desiredRecordingRef.current = false;
    pausedRef.current = false;
    try {
      recognitionRef.current?.abort();
    } catch {
      // Ignore browser-specific abort failures.
    }
    desiredRecordingRef.current = true;
    setIsPaused(false);
    setIsRecording(false);
    setIsListening(false);
    setSpeechError('');
    setRecordingStatus('Listening');
    startRecognitionSafely('Resume failed. Use retry or type manually.');
  };

  const retryRecording = () => {
    desiredRecordingRef.current = false;
    pausedRef.current = false;
    try {
      recognitionRef.current?.abort();
    } catch {
      // Ignore browser-specific abort failures.
    }
    setIsRecording(false);
    setIsPaused(false);
    setIsListening(false);
    setIsProcessing(false);
    setRecordingStatus('Retrying');
    window.setTimeout(() => beginRecording({ clear: true }), 550);
  };

  const submitAnswer = async () => {
    if (!userAnswer.trim()) {
      alert('Please provide an answer.');
      return;
    }
    stopRecording();
    try {
      setIsSubmitting(true);
      setInterviewState('Evaluating');
      const response = await apiFetch('/api/interviews/answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          questionIndex: currentQuestionIndex,
          userAnswer: userAnswer.trim(),
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error || 'Failed to submit answer');
      setFeedback(data);
      setAnswerEvaluations((current) => {
        const next = [...current];
        next[currentQuestionIndex] = {
          question: currentQuestion,
          answer: userAnswer.trim(),
          score: Number(data.score || 0),
          feedback: data.feedback || '',
          strengths: data.strengths || [],
          weaknesses: data.weaknesses || [],
          missingInformation: data.missingInformation || [],
          betterAnswer: data.betterAnswer || '',
          followUpQuestion: data.followUpQuestion || '',
          fillerWords: data.fillerWords || [],
          dimensions: data.dimensions || {},
        };
        return next;
      });
      setInterviewState('Thinking');
    } catch (error) {
      alert(error.message || 'Failed to evaluate answer');
      setInterviewState('Listening');
    } finally {
      setIsSubmitting(false);
    }
  };

  const nextQuestion = async () => {
    desiredRecordingRef.current = false;
    try {
      recognitionRef.current?.abort();
    } catch {
      // Ignore browser-specific abort failures.
    }
    if (currentQuestionIndex >= questions.length - 1) {
      completeSession();
      return;
    }
    const nextIndex = currentQuestionIndex + 1;
    setCurrentQuestionIndex(nextIndex);
    setUserAnswer('');
    setFeedback(null);
    setSpeechError('');
    setRecordingSeconds(0);
    setRecordingStatus('Ready');
    baseTranscriptRef.current = '';
    finalTranscriptRef.current = '';
    interimTranscriptRef.current = '';
    heardSpeechRef.current = false;
    await speakQuestion(questions[nextIndex]);
  };

  const buildInterviewReport = (rows) => {
    const completed = rows.filter(Boolean);
    const overallScore = completed.length
      ? Number((completed.reduce((sum, item) => sum + Number(item.score || 0), 0) / completed.length).toFixed(1))
      : 0;
    const technicalScore = averageDimension(completed, 'technicalAccuracy');
    const communicationScore = averageDimension(completed, 'communication');
    const confidenceScore = averageDimension(completed, 'confidence');
    const problemSolvingScore = averageDimension(completed, 'problemSolving');
    const selectionProbability = Math.round(Math.max(0, Math.min(100, (overallScore * 7) + (technicalScore * 1.2) + (communicationScore * 0.9) + (confidenceScore * 0.6))));
    return {
      overallScore,
      technicalScore,
      communicationScore,
      confidenceScore,
      problemSolvingScore,
      selectionProbability,
      verdict: verdictFor(overallScore),
      strengths: [...new Set(completed.flatMap((item) => item.strengths || []))].slice(0, 5),
      weakAreas: [...new Set(completed.flatMap((item) => item.weaknesses || []))].slice(0, 5),
      recommendedImprovements: [...new Set(completed.flatMap((item) => item.missingInformation || []))].slice(0, 6),
      questionsAsked: completed.map((item) => item.question),
      userAnswers: completed.map((item) => item.answer),
    };
  };

  const completeSession = async () => {
    try {
      setLoading(true);
      desiredRecordingRef.current = false;
      if (recognitionRef.current) recognitionRef.current.abort();
      await apiFetch(`/api/interviews/complete/${sessionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ duration: sessionSeconds }),
      }).catch(() => null);
      setInterviewReport(buildInterviewReport(answerEvaluations));
      setInterviewState('Thinking');
    } finally {
      setLoading(false);
    }
  };

  const resetSession = () => {
    desiredRecordingRef.current = false;
    pausedRef.current = false;
    try {
      recognitionRef.current?.abort();
      synthesisRef.current?.cancel();
    } catch {
      // Ignore reset failures.
    }
    setSessionId(null);
    setQuestions([]);
    setAskedQuestions([]);
    setCurrentQuestionIndex(0);
    setUserAnswer('');
    setFeedback(null);
    setSessionStarted(false);
    setAnswerEvaluations([]);
    setInterviewReport(null);
    setSpeechError('');
    setRecordingStatus('Ready');
    setIsSubmitting(false);
    setIsRecording(false);
    setIsPaused(false);
    setIsListening(false);
    setIsProcessing(false);
    setRecordingSeconds(0);
    setSessionSeconds(0);
    setInterviewState('Thinking');
    baseTranscriptRef.current = '';
    finalTranscriptRef.current = '';
    interimTranscriptRef.current = '';
    heardSpeechRef.current = false;
  };

  const confidenceMeter = useMemo(() => {
    if (feedback?.dimensions?.confidence) return Math.round(Number(feedback.dimensions.confidence) * 10);
    const words = userAnswer.trim().split(/\s+/).filter(Boolean).length;
    return Math.max(8, Math.min(82, words * 2));
  }, [feedback, userAnswer]);

  if (interviewReport) {
    return (
      <div className="mx-auto max-w-6xl space-y-6 pb-20">
        <div className="rounded-[28px] border border-cyan-300/15 bg-slate-950/75 p-6 shadow-2xl shadow-cyan-950/20">
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-300">Final Report</p>
              <h1 className="mt-2 text-4xl font-black uppercase italic tracking-tight text-slate-50">
                {interviewReport.verdict}
              </h1>
              <p className="mt-2 text-sm font-medium text-slate-400">
                Role: {interviewConfig.role} | Duration: {formatClock(sessionSeconds)} | Strict mode: {strictModeEnabled ? 'On' : 'Off'}
              </p>
            </div>
            <button
              onClick={resetSession}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-400 px-5 py-3 text-sm font-black uppercase tracking-wider text-slate-950 transition hover:bg-cyan-300"
            >
              <RotateCcw className="size-4" />
              New Interview
            </button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-6">
          {[
            ['Overall', interviewReport.overallScore, '/10', 'md:col-span-2'],
            ['Technical', interviewReport.technicalScore, '/10', 'md:col-span-1'],
            ['Communication', interviewReport.communicationScore, '/10', 'md:col-span-1'],
            ['Confidence', interviewReport.confidenceScore, '/10', 'md:col-span-1'],
            ['Problem Solving', interviewReport.problemSolvingScore, '/10', 'md:col-span-1'],
          ].map(([label, value, suffix, className]) => (
            <ScoreTile key={label} label={label} value={value} suffix={suffix} className={className} />
          ))}
          <ScoreTile label="Selection Probability" value={interviewReport.selectionProbability} suffix="%" className="md:col-span-6" />
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <ReportList title="Strengths" items={interviewReport.strengths} />
          <ReportList title="Weak Areas" items={interviewReport.weakAreas} />
          <ReportList title="Recommended Improvements" items={interviewReport.recommendedImprovements} />
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-5">
          <p className="mb-4 text-xs font-black uppercase tracking-widest text-slate-400">Questions Asked And User Answers</p>
          <div className="space-y-4">
            {answerEvaluations.filter(Boolean).map((item, index) => (
              <div key={`${item.question}-${index}`} className="rounded-xl border border-white/10 bg-black/20 p-4">
                <p className="text-sm font-bold text-cyan-100">{index + 1}. {item.question}</p>
                <p className="mt-2 text-sm leading-relaxed text-slate-300">{item.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-20">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-500/10 px-4 py-2 text-xs font-black uppercase tracking-widest text-cyan-200">
            <Mic className="size-4" />
            Voice Interview
          </div>
          <h1 className="mt-4 text-4xl font-black uppercase italic tracking-tight md:text-6xl">
            Strict Voice <span className="text-cyan-300">Interview</span>
          </h1>
          <p className="mt-3 max-w-2xl text-sm font-medium leading-relaxed text-slate-400">
            One question at a time. Strict scoring, real follow-ups, and role-specific pressure.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs md:w-[360px]">
          <StatusPill label="Permission" value={permissionStatus} tone={permissionStatus === 'granted' ? 'green' : 'yellow'} />
          <StatusPill label="Microphone" value={micStatus} tone={micStatus === 'connected' ? 'green' : 'red'} />
          <StatusPill label="Recording" value={isRecording ? (isPaused ? 'paused' : 'active') : 'stopped'} tone={isRecording ? 'red' : 'slate'} />
          <StatusPill label="State" value={interviewState} tone={interviewState === 'Evaluating' ? 'yellow' : 'cyan'} />
        </div>
      </div>

      {!sessionStarted ? (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="rounded-[28px] border border-cyan-300/15 bg-slate-950/75 p-6 shadow-2xl shadow-cyan-950/20">
          <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
            <div className="space-y-5">
              <div {...getRootProps()} className={`cursor-pointer rounded-2xl border-2 border-dashed p-7 text-center transition ${isDragActive ? 'border-cyan-300 bg-cyan-500/10' : 'border-slate-500/30 bg-white/[0.025] hover:border-cyan-300/40'} ${resumeText ? 'border-emerald-400/50 bg-emerald-500/5' : ''}`}>
                <input {...getInputProps()} />
                {resumeText ? (
                  <div className="space-y-2">
                    <FileText className="mx-auto size-8 text-emerald-300" />
                    <p className="text-sm font-black text-emerald-200">Resume Loaded</p>
                    <button
                      onClick={(event) => {
                        event.stopPropagation();
                        setResumeText('');
                        setResumeFile(null);
                      }}
                      className="text-xs font-bold text-slate-400 underline-offset-4 hover:text-slate-200 hover:underline"
                    >
                      Clear file
                    </button>
                  </div>
                ) : resumeFile ? (
                  <div className="space-y-3">
                    <FileText className="mx-auto size-8 text-cyan-300" />
                    <p className="text-sm font-black text-cyan-100">{resumeFile.name}</p>
                    <button
                      onClick={(event) => {
                        event.stopPropagation();
                        handleUploadResume();
                      }}
                      disabled={isUploading}
                      className="inline-flex items-center gap-2 rounded-xl bg-cyan-400 px-4 py-2 text-xs font-black uppercase tracking-wider text-slate-950 disabled:opacity-50"
                    >
                      {isUploading && <Loader2 className="size-3 animate-spin" />}
                      Upload Resume
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload className="mx-auto size-8 text-slate-400" />
                    <p className="text-sm font-black text-slate-200">Drag and drop your resume here</p>
                    <p className="text-xs font-medium text-slate-500">PDF, DOCX, or TXT</p>
                  </div>
                )}
              </div>

              <textarea
                value={resumeText}
                onChange={(event) => setResumeText(event.target.value)}
                placeholder="Paste resume text here..."
                className="h-40 w-full resize-none rounded-2xl border border-white/10 bg-white/[0.045] p-5 text-sm leading-relaxed text-slate-200 outline-none placeholder:text-slate-600 focus:border-cyan-300/40"
              />
            </div>

            <div className="space-y-4">
              <SelectField label="Job Role" value={interviewConfig.role} options={ROLE_OPTIONS} onChange={(value) => setInterviewConfig((current) => ({ ...current, role: value }))} />
              <SelectField label="Interview Type" value={interviewConfig.type} options={INTERVIEW_TYPES} onChange={(value) => setInterviewConfig((current) => ({ ...current, type: value }))} />
              <SelectField label="Difficulty" value={interviewConfig.difficulty} options={DIFFICULTIES} onChange={(value) => setInterviewConfig((current) => ({ ...current, difficulty: value, strictMode: value === 'Strict Mode' ? true : current.strictMode }))} />
              <label className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/25 p-4">
                <span>
                  <span className="block text-xs font-black uppercase tracking-widest text-slate-400">Strict Mode</span>
                  <span className="mt-1 block text-xs font-medium text-slate-500">Challenge vague answers</span>
                </span>
                <input
                  type="checkbox"
                  checked={strictModeEnabled}
                  onChange={(event) => setInterviewConfig((current) => ({ ...current, strictMode: event.target.checked }))}
                  className="size-5 accent-cyan-300"
                />
              </label>
              <button
                onClick={startSession}
                disabled={loading || !resumeText.trim()}
                className="flex w-full items-center justify-center gap-3 rounded-2xl bg-cyan-400 px-5 py-4 text-xs font-black uppercase tracking-[0.18em] text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-500"
              >
                {loading ? <Loader2 className="size-5 animate-spin" /> : <Play className="size-5" />}
                Start Interview Session
              </button>
            </div>
          </div>
        </motion.div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
          <aside className="space-y-4">
            <div className="rounded-2xl border border-cyan-300/15 bg-white/[0.035] p-5">
              <AIAvatar state={interviewState} speaking={isSpeaking} listening={isListening} />
              <div className="mt-5 grid grid-cols-2 gap-3">
                <MetricTile icon={Gauge} label="Strictness" value={strictModeEnabled ? 'High' : interviewConfig.difficulty} />
                <MetricTile icon={BarChart3} label="Confidence" value={`${confidenceMeter}%`} />
                <MetricTile icon={ShieldAlert} label="Timer" value={formatClock(sessionSeconds)} />
                <MetricTile icon={Waves} label="Record" value={formatClock(recordingSeconds)} />
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
              <p className="mb-3 text-xs font-black uppercase tracking-widest text-slate-400">Question History</p>
              <div className="space-y-2">
                {askedQuestions.map((question, index) => (
                  <div key={`${question}-${index}`} className={`rounded-xl p-3 text-xs leading-relaxed ${index === currentQuestionIndex ? 'border border-cyan-300/30 bg-cyan-400/10 text-cyan-50' : 'bg-black/20 text-slate-400'}`}>
                    {index + 1}. {question}
                  </div>
                ))}
              </div>
            </div>
          </aside>

          <main className="space-y-5">
            <div className="rounded-2xl border border-cyan-300/20 bg-slate-950/75 p-5">
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="text-xs font-black uppercase tracking-widest text-slate-400">Question {currentQuestionIndex + 1} of {questions.length}</p>
                <button
                  onClick={() => speakQuestion(currentQuestion)}
                  disabled={isSpeaking}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-xs font-bold text-slate-100 transition hover:border-cyan-300/30 disabled:opacity-50"
                >
                  <Volume2 className="size-4" />
                  Repeat
                </button>
              </div>
              <h2 className="text-xl font-black leading-snug text-slate-50 md:text-2xl">{currentQuestion}</h2>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-black/40">
                <motion.div className="h-full bg-cyan-300" animate={{ width: `${((currentQuestionIndex + 1) / Math.max(questions.length, 1)) * 100}%` }} />
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-5">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-slate-400">Live Transcript</p>
                  <p className="mt-1 text-sm font-medium text-slate-500">{recordingStatus}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {!isRecording && !isPaused && (
                    <IconButton onClick={() => beginRecording()} icon={Mic} label="Start Recording" tone="red" />
                  )}
                  {isRecording && !isPaused && (
                    <>
                      <IconButton onClick={pauseRecording} icon={Pause} label="Pause" tone="slate" />
                      <IconButton onClick={stopRecording} icon={StopCircle} label="Stop" tone="red" />
                    </>
                  )}
                  {isPaused && <IconButton onClick={resumeRecording} icon={Play} label="Resume" tone="cyan" />}
                  <IconButton onClick={retryRecording} icon={RefreshCcw} label="Retry" tone="slate" />
                </div>
              </div>

              <Waveform bars={waveform} active={isRecording && !isPaused} />

              {speechError && (
                <div className="mt-4 flex gap-3 rounded-xl border border-yellow-300/20 bg-yellow-500/10 p-3 text-sm text-yellow-100">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                  <p>{speechError}</p>
                </div>
              )}

              <textarea
                value={userAnswer}
                onChange={(event) => {
                  setUserAnswer(event.target.value);
                  baseTranscriptRef.current = event.target.value;
                  setFeedback(null);
                  if (event.target.value.trim()) setSpeechError('');
                }}
                placeholder="Speak or type your answer here..."
                className="mt-4 h-40 w-full resize-none rounded-2xl border border-white/10 bg-black/25 p-4 text-sm leading-relaxed text-slate-100 outline-none placeholder:text-slate-600 focus:border-cyan-300/40"
              />

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  onClick={submitAnswer}
                  disabled={!userAnswer.trim() || isSubmitting}
                  className="flex-1 rounded-xl bg-cyan-400 px-5 py-3 text-sm font-black uppercase tracking-wider text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-500"
                >
                  {isSubmitting ? 'Evaluating...' : 'Submit Answer'}
                </button>
                {feedback && currentQuestionIndex < questions.length - 1 && (
                  <button onClick={nextQuestion} className="inline-flex items-center gap-2 rounded-xl bg-slate-700 px-5 py-3 text-sm font-black uppercase tracking-wider text-white transition hover:bg-slate-600">
                    <SkipForward className="size-4" />
                    Next
                  </button>
                )}
                {feedback && currentQuestionIndex === questions.length - 1 && (
                  <button onClick={completeSession} className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-3 text-sm font-black uppercase tracking-wider text-slate-950 transition hover:bg-emerald-400">
                    <CheckCircle className="size-4" />
                    Finish
                  </button>
                )}
              </div>
            </div>

            {feedback && <FeedbackPanel feedback={feedback} />}
          </main>
        </div>
      )}
    </div>
  );
};

const StatusPill = ({ label, value, tone = 'slate' }) => {
  const colors = {
    green: 'border-emerald-300/25 bg-emerald-400/10 text-emerald-100',
    red: 'border-red-300/25 bg-red-400/10 text-red-100',
    yellow: 'border-yellow-300/25 bg-yellow-400/10 text-yellow-100',
    cyan: 'border-cyan-300/25 bg-cyan-400/10 text-cyan-100',
    slate: 'border-white/10 bg-white/[0.04] text-slate-200',
  };
  return (
    <div className={`rounded-xl border px-3 py-2 ${colors[tone] || colors.slate}`}>
      <p className="text-[10px] font-black uppercase tracking-widest opacity-60">{label}</p>
      <p className="mt-1 truncate text-xs font-black uppercase">{value}</p>
    </div>
  );
};

const SelectField = ({ label, value, options, onChange }) => (
  <label className="block">
    <span className="mb-2 block text-xs font-black uppercase tracking-widest text-slate-500">{label}</span>
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm font-bold text-slate-100 outline-none focus:border-cyan-300/50"
    >
      {options.map((option) => <option key={option}>{option}</option>)}
    </select>
  </label>
);

const IconButton = ({ icon: Icon, label, onClick, tone }) => {
  const styles = tone === 'red'
    ? 'border-red-300/25 bg-red-500/15 text-red-100 hover:bg-red-500/25'
    : tone === 'cyan'
      ? 'border-cyan-300/25 bg-cyan-500/15 text-cyan-100 hover:bg-cyan-500/25'
      : 'border-white/10 bg-white/[0.05] text-slate-100 hover:bg-white/[0.08]';
  return (
    <button onClick={onClick} title={label} className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-black uppercase tracking-wider transition ${styles}`}>
      <Icon className="size-4" />
      {label}
    </button>
  );
};

const Waveform = ({ bars, active }) => (
  <div className="flex h-20 items-center gap-1 rounded-2xl border border-white/10 bg-black/25 px-4">
    {bars.map((height, index) => (
      <motion.span
        key={index}
        animate={{ height: active ? `${height}%` : `${Math.max(12, height * 0.45)}%`, opacity: active ? 1 : 0.45 }}
        transition={{ duration: 0.12 }}
        className="w-full rounded-full bg-cyan-300"
      />
    ))}
  </div>
);

const AIAvatar = ({ state, speaking, listening }) => (
  <div className="text-center">
    <div className="relative mx-auto flex size-28 items-center justify-center rounded-full border border-cyan-300/30 bg-cyan-400/10">
      <motion.div
        className="absolute inset-0 rounded-full border border-cyan-300/30"
        animate={{ scale: speaking || listening ? [1, 1.16, 1] : 1, opacity: speaking || listening ? [0.5, 0.1, 0.5] : 0.25 }}
        transition={{ repeat: speaking || listening ? Infinity : 0, duration: 1.2 }}
      />
      {listening ? <Mic className="size-10 text-cyan-200" /> : speaking ? <Volume2 className="size-10 text-cyan-200" /> : <MicOff className="size-10 text-slate-400" />}
    </div>
    <p className="mt-4 text-xs font-black uppercase tracking-[0.22em] text-cyan-300">AI Interviewer</p>
    <p className="mt-1 text-lg font-black text-slate-100">{state}</p>
  </div>
);

const MetricTile = ({ icon: Icon, label, value }) => (
  <div className="rounded-xl border border-white/10 bg-black/25 p-3">
    <Icon className="mb-2 size-4 text-cyan-300" />
    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{label}</p>
    <p className="mt-1 text-sm font-black text-slate-100">{value}</p>
  </div>
);

const FeedbackPanel = ({ feedback }) => (
  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-cyan-300/20 bg-cyan-500/10 p-5">
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-xs font-black uppercase tracking-widest text-cyan-200">Strict Feedback</p>
        <p className="mt-1 text-sm leading-relaxed text-cyan-50">{feedback.feedback}</p>
      </div>
      <div className="text-4xl font-black text-cyan-100">{Number(feedback.score || 0).toFixed(1)}/10</div>
    </div>

    <div className="mt-5 grid gap-3 sm:grid-cols-4">
      {Object.entries(feedback.dimensions || {}).map(([label, value]) => (
        <div key={label} className="rounded-xl bg-black/25 p-3">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{label.replace(/([A-Z])/g, ' $1')}</p>
          <p className="mt-1 text-lg font-black text-cyan-100">{Number(value).toFixed(1)}/10</p>
        </div>
      ))}
    </div>

    <div className="mt-5 grid gap-4 md:grid-cols-2">
      <MiniList title="Strengths" items={feedback.strengths} />
      <MiniList title="Weaknesses" items={feedback.weaknesses} />
      <MiniList title="Missing Information" items={feedback.missingInformation} />
      <div className="rounded-xl bg-black/25 p-4">
        <p className="text-xs font-black uppercase tracking-widest text-slate-400">Follow-Up Question</p>
        <p className="mt-2 text-sm font-semibold leading-relaxed text-cyan-50">{feedback.followUpQuestion}</p>
      </div>
    </div>

    <div className="mt-4 rounded-xl bg-black/25 p-4">
      <p className="text-xs font-black uppercase tracking-widest text-slate-400">Better Example Answer</p>
      <p className="mt-2 text-sm leading-relaxed text-slate-200">{feedback.betterAnswer}</p>
    </div>
  </motion.div>
);

const MiniList = ({ title, items = [] }) => (
  <div className="rounded-xl bg-black/25 p-4">
    <p className="text-xs font-black uppercase tracking-widest text-slate-400">{title}</p>
    <ul className="mt-2 space-y-2">
      {(items.length ? items : ['No item returned.']).map((item) => (
        <li key={item} className="text-sm leading-relaxed text-slate-200">{item}</li>
      ))}
    </ul>
  </div>
);

const ScoreTile = ({ label, value, suffix, className = '' }) => (
  <div className={`rounded-2xl border border-white/10 bg-white/[0.035] p-5 ${className}`}>
    <p className="text-xs font-black uppercase tracking-widest text-slate-500">{label}</p>
    <p className="mt-3 text-3xl font-black text-cyan-100">{value}{suffix}</p>
  </div>
);

const ReportList = ({ title, items = [] }) => (
  <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-5">
    <p className="mb-3 text-xs font-black uppercase tracking-widest text-slate-400">{title}</p>
    <ul className="space-y-2">
      {(items.length ? items : ['No major items recorded.']).map((item) => (
        <li key={item} className="flex gap-2 text-sm leading-relaxed text-slate-200">
          <CheckCircle className="mt-0.5 size-4 shrink-0 text-emerald-300" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  </div>
);
