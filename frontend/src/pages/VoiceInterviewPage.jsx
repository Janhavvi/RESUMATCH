import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion } from 'motion/react';
import {
  Mic,
  MicOff,
  Volume2,
  StopCircle,
  Play,
  SkipForward,
  CheckCircle,
  RotateCcw,
  Upload,
  FileText,
  Loader2,
} from 'lucide-react';
import { apiFetch } from '../lib/api.js';

export const VoiceInterviewPage = () => {
  const [sessionId, setSessionId] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [userAnswer, setUserAnswer] = useState('');
  const [recordingStatus, setRecordingStatus] = useState('');
  const [speechError, setSpeechError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [loading, setLoading] = useState(false);
  const [resumeFile, setResumeFile] = useState(null);
  const [resumeText, setResumeText] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [sessionScore, setSessionScore] = useState(null);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [fillerWords, setFillerWords] = useState([]);

  const recognitionRef = useRef(null);
  const synthesisRef = useRef(null);
  const baseTranscriptRef = useRef('');
  const finalTranscriptRef = useRef('');
  const speechTimeoutRef = useRef(null);
  const heardSpeechRef = useRef(false);

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
      'text/plain': ['.txt']
    },
    multiple: false
  });

  const handleUploadResume = async () => {
    if (!resumeFile) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('resume', resumeFile);

    try {
      const response = await apiFetch('/api/resume/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        if (response.status === 413) {
          throw new Error('File is too large. Maximum size is 3MB on this deployment.');
        }
        if (response.status === 400) {
          throw new Error(data?.error || 'Invalid file. Please use PDF, DOCX, or TXT files.');
        }
        throw new Error(data?.error || 'Upload failed. Please try again.');
      }

      if (!data?.text) {
        throw new Error('Upload succeeded but no resume text was returned');
      }

      setResumeText(data.text);
      setResumeFile(null);
    } catch (error) {
      console.error(error);
      alert(error.message || 'Upload failed. Please try again.');
      setResumeFile(null);
    } finally {
      setIsUploading(false);
    }
  };

  // Initialize Web Speech API
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event) => {
        let interim = '';
        let final = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            final += `${transcript} `;
          } else {
            interim += transcript;
          }
        }

        if (final || interim) {
          heardSpeechRef.current = true;
          setSpeechError('');
          if (speechTimeoutRef.current) {
            clearTimeout(speechTimeoutRef.current);
            speechTimeoutRef.current = null;
          }
        }

        if (final) {
          finalTranscriptRef.current = `${finalTranscriptRef.current}${final}`.trimStart();
        }

        const parts = [
          baseTranscriptRef.current.trim(),
          finalTranscriptRef.current.trim(),
          interim.trim(),
        ].filter(Boolean);
        setUserAnswer(parts.join(' ').replace(/\s+/g, ' '));
      };

      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        const messages = {
          'not-allowed': 'Microphone permission denied. Please allow microphone access or type your answer.',
          'service-not-allowed': 'Microphone permission denied. Please allow microphone access or type your answer.',
          'no-speech': 'No speech detected. Please try recording again or type your answer.',
          'audio-capture': 'No microphone was found. Please connect a microphone or type your answer.',
          network: 'Speech recognition network error. Please try again or type your answer.',
        };
        setSpeechError(messages[event.error] || 'Speech recognition failed. Please try again or type your answer.');
        setRecordingStatus('');
        setIsRecording(false);
      };

      recognitionRef.current.onstart = () => {
        setIsRecording(true);
        setRecordingStatus('Listening...');
      };

      recognitionRef.current.onspeechstart = () => {
        heardSpeechRef.current = true;
        setRecordingStatus('Listening...');
        setSpeechError('');
      };

      recognitionRef.current.onspeechend = () => {
        setRecordingStatus('Processing speech...');
      };

      recognitionRef.current.onend = () => {
        setIsRecording(false);
        setRecordingStatus('');
        if (speechTimeoutRef.current) {
          clearTimeout(speechTimeoutRef.current);
          speechTimeoutRef.current = null;
        }
        if (!heardSpeechRef.current) {
          setSpeechError('No speech detected. Please try recording again or type your answer.');
        }
      };
    } else {
      recognitionRef.current = null;
    }

    synthesisRef.current = window.speechSynthesis;
    return () => {
      if (speechTimeoutRef.current) {
        clearTimeout(speechTimeoutRef.current);
      }
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
      if (synthesisRef.current) {
        synthesisRef.current.cancel();
      }
    };
  }, []);

  const startSession = async () => {
    if (!resumeText) {
      alert('Please paste your resume text first');
      return;
    }

    try {
      setLoading(true);
      const response = await apiFetch('/api/interviews/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resumeText }),
      });

      if (!response.ok) {
        throw new Error('Failed to start interview session');
      }

      const data = await response.json();
      setSessionId(data.session.id);
      setQuestions(data.session.questions);
      setSessionStarted(true);
      setCurrentQuestionIndex(0);

      // Speak the first question
      if (synthesisRef.current) {
        await speakQuestion(data.session.questions[0]);
      }
    } catch (error) {
      console.error('Error starting interview:', error);
      alert('Failed to start interview session');
    } finally {
      setLoading(false);
    }
  };

  const speakQuestion = (question) => {
    return new Promise((resolve) => {
      if (!synthesisRef.current) return resolve();

      const utterance = new SpeechSynthesisUtterance(question);
      utterance.rate = 1;
      utterance.pitch = 1;
      utterance.volume = 1;

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => {
        setIsSpeaking(false);
        resolve();
      };

      synthesisRef.current.speak(utterance);
    });
  };

  const startRecording = async () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition || !recognitionRef.current) {
      setSpeechError('Voice recording is not supported in this browser. Please type your answer.');
      return;
    }

    setSpeechError('');
    setRecordingStatus('Checking microphone...');

    try {
      if (navigator.mediaDevices?.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((track) => track.stop());
      }

      baseTranscriptRef.current = userAnswer.trim();
      finalTranscriptRef.current = '';
      heardSpeechRef.current = false;
      setFeedback(null);
      setFillerWords([]);
      setIsRecording(true);
      setRecordingStatus('Listening...');

      if (speechTimeoutRef.current) clearTimeout(speechTimeoutRef.current);
      speechTimeoutRef.current = setTimeout(() => {
        if (!heardSpeechRef.current && recognitionRef.current) {
          setSpeechError('Recognition timeout. No speech was detected. Please try again or type your answer.');
          try {
            recognitionRef.current.stop();
          } catch {
            setIsRecording(false);
            setRecordingStatus('');
          }
        }
      }, 12000);

      recognitionRef.current.start();
    } catch (error) {
      console.error('Error starting recording:', error);
      setIsRecording(false);
      setRecordingStatus('');
      if (error?.name === 'NotAllowedError' || error?.name === 'PermissionDeniedError') {
        setSpeechError('Microphone permission denied. Please allow microphone access or type your answer.');
      } else if (error?.name === 'NotFoundError') {
        setSpeechError('No microphone was found. Please connect a microphone or type your answer.');
      } else {
        setSpeechError('Error starting recording. Please check your microphone permissions or type your answer.');
      }
    }
  };

  const stopRecording = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
        setRecordingStatus('Processing speech...');
      } catch (error) {
        console.error('Error stopping recording:', error);
        setIsRecording(false);
        setRecordingStatus('');
      }
    }
  };

  const submitAnswer = async () => {
    if (!userAnswer.trim()) {
      alert('Please provide an answer');
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await apiFetch('/api/interviews/answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          questionIndex: currentQuestionIndex,
          userAnswer: userAnswer.trim(),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit answer');
      }

      const data = await response.json();
      setFeedback(data);
      setFillerWords(data.fillerWords || []);
    } catch (error) {
      console.error('Error submitting answer:', error);
      alert('Failed to evaluate answer');
    } finally {
      setIsSubmitting(false);
    }
  };

  const nextQuestion = async () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setUserAnswer('');
      setFeedback(null);
      setFillerWords([]);
      setSpeechError('');
      setRecordingStatus('');
      baseTranscriptRef.current = '';
      finalTranscriptRef.current = '';
      heardSpeechRef.current = false;

      await new Promise((resolve) => setTimeout(resolve, 500));
      if (synthesisRef.current) {
        await speakQuestion(questions[currentQuestionIndex + 1]);
      }
    } else {
      completeSession();
    }
  };

  const completeSession = async () => {
    try {
      setLoading(true);
      const response = await apiFetch(`/api/interviews/complete/${sessionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ duration: 0 }),
      });

      if (!response.ok) {
        throw new Error('Failed to complete session');
      }

      const data = await response.json();
      setSessionScore(data.overallScore);
    } catch (error) {
      console.error('Error completing session:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetSession = () => {
    setSessionId(null);
    setQuestions([]);
    setCurrentQuestionIndex(0);
    setUserAnswer('');
    setFeedback(null);
    setSessionScore(null);
    setSessionStarted(false);
    setFillerWords([]);
    setSpeechError('');
    setRecordingStatus('');
    setIsSubmitting(false);
    setIsRecording(false);
    baseTranscriptRef.current = '';
    finalTranscriptRef.current = '';
    heardSpeechRef.current = false;
  };

  if (sessionScore !== null) {
    return (
      <div className="max-w-6xl mx-auto space-y-12 pb-20">
        <div className="text-center space-y-12">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-6"
          >
            <CheckCircle className="size-24 text-green-400 mx-auto" />
            <h1 className="text-4xl md:text-6xl font-black italic uppercase tracking-tight">
              Interview <span className="text-cyan-300">Complete!</span>
            </h1>
            <div className="space-y-4">
              <div className="text-6xl font-black text-cyan-300">{sessionScore}%</div>
              <p className="text-xl text-slate-400">Your Overall Interview Score</p>
            </div>
          </motion.div>

          <motion.button
            onClick={resetSession}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center gap-2 px-8 py-4 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-xl transition-all mx-auto"
          >
            <RotateCcw className="size-5" />
            Start New Interview
          </motion.button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-12 pb-20">
      {/* Header */}
      <div className="text-center space-y-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-cyan-500/10 text-cyan-200 font-bold text-xs uppercase tracking-widest border border-cyan-300/20"
        >
          <Mic className="size-4" /> Voice Interview
        </motion.div>
        <h1 className="text-4xl md:text-6xl font-black italic uppercase tracking-tight">
          Voice-Activated <span className="text-cyan-300">Interview Simulator</span>
        </h1>
        <p className="text-slate-400 text-lg max-w-2xl mx-auto font-medium">
          Answer AI-generated questions with your voice. Get feedback on clarity, filler words, and technical accuracy.
        </p>
      </div>

      {!sessionStarted ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-8 rounded-[36px] glass space-y-6 tile-3d"
        >
          <div className="flex items-start gap-4">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-cyan-300/10">
              <Mic className="size-6 text-cyan-200" />
            </div>
            <div>
              <h2 className="text-xl font-black uppercase italic tracking-tight">Resume Source</h2>
              <p className="mt-2 text-sm font-medium leading-relaxed text-slate-400">
                Upload your resume file or paste resume text to generate tailored interview questions.
              </p>
            </div>
          </div>

          {/* Resume Upload Area */}
          <div
            {...getRootProps()}
            className={`
              relative border-2 border-dashed rounded-3xl p-8 text-center transition-all cursor-pointer
              ${isDragActive 
                ? 'border-cyan-400 bg-cyan-500/10' 
                : 'border-slate-500/30 hover:border-slate-400/50 hover:bg-slate-500/5'}
              ${resumeText ? 'border-emerald-500/50 bg-emerald-500/5' : ''}
            `}
          >
            <input {...getInputProps()} />
            {resumeText ? (
              <div className="space-y-3">
                <div className="flex justify-center">
                  <div className="p-2 rounded-full bg-emerald-500/10 border border-emerald-500/30">
                    <FileText className="size-6 text-emerald-400" />
                  </div>
                </div>
                <div>
                  <p className="text-emerald-400 font-bold text-sm mb-1">Resume Loaded ✓</p>
                  <p className="text-xs text-slate-400">Ready to generate interview questions</p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setResumeText('');
                    setResumeFile(null);
                  }}
                  className="text-xs text-slate-500 hover:text-slate-300 transition-colors underline"
                >
                  Clear and upload different file
                </button>
              </div>
            ) : resumeFile ? (
              <div className="space-y-3">
                <div className="flex justify-center">
                  <div className="p-2 rounded-full bg-cyan-500/10 border border-cyan-500/30 relative">
                    <FileText className="size-6 text-cyan-400" />
                    {isUploading && (
                      <div className="absolute inset-0 flex items-center justify-center rounded-full bg-cyan-600/50">
                        <Loader2 className="size-4 animate-spin text-white" />
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-cyan-300 font-bold text-sm mb-1">{resumeFile.name}</p>
                  <p className="text-xs text-slate-400 mb-3">Ready to upload</p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleUploadResume();
                  }}
                  disabled={isUploading}
                  className={`
                    px-4 py-2 rounded-lg font-bold uppercase tracking-wider text-xs transition-all
                    ${isUploading 
                      ? 'bg-slate-700 text-slate-500 cursor-not-allowed' 
                      : 'bg-cyan-500 text-white hover:bg-cyan-600 shadow-lg shadow-cyan-500/30'}
                  `}
                >
                  {isUploading ? <><Loader2 className="inline size-3 animate-spin mr-2" /> Uploading...</> : <>Upload Resume</>}
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex justify-center">
                  <div className="p-2 rounded-full bg-slate-500/10 border border-slate-500/30">
                    <Upload className="size-6 text-slate-400" />
                  </div>
                </div>
                <div>
                  <p className="text-slate-200 font-bold text-sm">Drag and drop your resume here</p>
                  <p className="text-xs text-slate-400">(PDF, DOCX, or TXT)</p>
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-white/10 pt-6">
            <p className="text-xs text-slate-500 font-medium mb-4">Or paste resume text directly:</p>
            <textarea
              value={resumeText}
              onChange={(e) => setResumeText(e.target.value)}
              placeholder="Paste your resume text here..."
              className="h-40 w-full resize-none rounded-3xl border border-white/10 bg-white/[0.045] p-6 text-sm leading-relaxed text-slate-200 outline-none transition-all placeholder:text-slate-600 focus:border-cyan-300/40"
            />
          </div>

          <button
            onClick={startSession}
            disabled={loading || !resumeText}
            className={`flex w-full items-center justify-center gap-3 rounded-2xl px-8 py-5 text-xs font-black uppercase tracking-[0.18em] transition-all ${
              loading || !resumeText
                ? 'cursor-not-allowed border border-white/5 bg-slate-800 text-slate-500'
                : 'border border-cyan-300/40 bg-cyan-400 text-slate-950 shadow-2xl shadow-cyan-500/20 hover:bg-cyan-300 active:scale-95'
            }`}
          >
            {loading ? (
              <>
                <div className="size-5 animate-spin rounded-full border-2 border-slate-600 border-t-slate-300" />
                Starting Interview...
              </>
            ) : (
              <>
                <Play className="size-5" />
                Start Interview Session
              </>
            )}
          </button>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Progress */}
          <div className="p-4 rounded-xl glass border border-white/10">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-400">
                Question {currentQuestionIndex + 1} of {questions.length}
              </span>
              <span className="text-xs font-bold text-cyan-300">
                {Math.round(((currentQuestionIndex + 1) / questions.length) * 100)}%
              </span>
            </div>
            <div className="w-full bg-slate-700/50 rounded-full h-2 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
                className="h-full bg-cyan-400 rounded-full transition-all"
              />
            </div>
          </div>

          {/* Question */}
          <motion.div
            key={currentQuestionIndex}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-8 rounded-2xl glass border border-cyan-300/20 space-y-4"
          >
            <div className="flex items-start gap-4">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-cyan-500/20 border border-cyan-300/40">
                <Volume2 className="size-5 text-cyan-300" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-slate-100 leading-relaxed">
                  {questions[currentQuestionIndex]}
                </h3>
                {isSpeaking && (
                  <p className="text-sm text-cyan-300 mt-2 animate-pulse">🔊 AI is speaking...</p>
                )}
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={() => speakQuestion(questions[currentQuestionIndex])}
                disabled={isSpeaking}
                className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-lg transition-all disabled:opacity-50"
              >
                <Volume2 className="size-4" />
                Repeat Question
              </button>
            </div>
          </motion.div>

          {/* Recording */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-8 rounded-2xl glass border border-white/10 space-y-4"
          >
            <h3 className="text-lg font-bold">Your Answer</h3>

            <div className="flex gap-2 mb-4">
              {!isRecording ? (
                <motion.button
                  onClick={startRecording}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex items-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition-all shadow-lg shadow-red-500/30"
                >
                  <Mic className="size-5 animate-pulse" />
                  Start Recording
                </motion.button>
              ) : (
                <motion.button
                  onClick={stopRecording}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex items-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition-all shadow-lg shadow-red-500/50 animate-pulse"
                >
                  <StopCircle className="size-5" />
                  Listening...
                  <span className="text-xs font-semibold opacity-80">(click to stop)</span>
                </motion.button>
              )}
            </div>

            {isRecording && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-300/20 mb-4">
                <div className="flex items-center gap-3">
                  <span className="size-3 rounded-full bg-red-400 shadow-lg shadow-red-400/60 animate-pulse" />
                  <p className="text-sm text-red-200 animate-pulse">{recordingStatus || 'Listening...'} Speak your answer</p>
                </div>
              </div>
            )}

            {speechError && (
              <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-300/20 mb-4">
                <p className="text-sm text-yellow-100">{speechError}</p>
              </div>
            )}

            <p className="text-xs text-slate-500 font-medium mb-3">Or type your answer below:</p>
            <textarea
              value={userAnswer}
              onChange={(e) => {
                setUserAnswer(e.target.value);
                if (e.target.value.trim()) setSpeechError('');
                setFeedback(null);
              }}
              placeholder="Your answer will appear here (from voice or typed)..."
              className="h-32 w-full resize-none rounded-lg border border-white/10 bg-white/[0.045] p-4 text-sm leading-relaxed text-slate-200 outline-none transition-all placeholder:text-slate-600 focus:border-cyan-300/40 mb-4"
            />

            {fillerWords.length > 0 && (
              <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-300/20 text-yellow-200 mb-4">
                <p className="text-sm font-medium mb-2">Filler words detected:</p>
                <p className="text-sm">{fillerWords.join(', ')}</p>
              </div>
            )}

            {feedback && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 rounded-lg bg-cyan-500/10 border border-cyan-300/20 space-y-3 mb-4"
              >
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-cyan-200">Feedback</h4>
                  <div className="text-2xl font-black text-cyan-300">{feedback.score}%</div>
                </div>
                <p className="text-sm text-cyan-100 leading-relaxed">{feedback.feedback}</p>
              </motion.div>
            )}

            <div className="flex gap-2 mt-6">
              <button
                onClick={submitAnswer}
                disabled={userAnswer.trim() === '' || isSubmitting}
                className={`flex-1 px-6 py-3 font-bold rounded-lg transition-all ${
                  userAnswer.trim() === '' || isSubmitting
                    ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                    : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-lg shadow-cyan-500/30'
                }`}
              >
                {isSubmitting ? 'Evaluating...' : 'Submit Answer'}
              </button>
              {currentQuestionIndex < questions.length - 1 && feedback && (
                <button
                  onClick={nextQuestion}
                  className="flex items-center gap-2 px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-lg transition-all"
                >
                  <SkipForward className="size-4" />
                  Next Question
                </button>
              )}
              {currentQuestionIndex === questions.length - 1 && feedback && (
                <button
                  onClick={completeSession}
                  className="flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg transition-all"
                >
                  <CheckCircle className="size-4" />
                  Complete Interview
                </button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
};
