
import { useRef, useState, useCallback } from 'react';
import { SoundEngine } from '../utils/SoundEngine.ts';

interface RecorderConfig {
  title: string;
  enableSound: boolean;
}

export const useScreenRecorder = ({ title, enableSound }: RecorderConfig) => {
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const setupRecording = async (): Promise<MediaRecorder | null> => {
    try {
      if (enableSound) SoundEngine.init();

      // 1. Get the Display Media (High Quality Config)
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: { 
            displaySurface: "browser", 
            cursor: "never",
            width: { ideal: 1920, max: 1920 }, // Force 1080p cap for performance
            height: { ideal: 1080, max: 1080 },
            frameRate: { ideal: 30, max: 60 },
        },
        audio: {
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false,
            sampleRate: 48000
        },
        preferCurrentTab: true, 
        selfBrowserSurface: "include",
        surfaceSwitching: "include",
        systemAudio: "include" 
      } as any);

      const videoTrack = displayStream.getVideoTracks()[0];
      const tracks = [videoTrack];
      const systemAudioTrack = displayStream.getAudioTracks()[0];

      // 2. Mix System Audio with Internal Sound Engine
      if (systemAudioTrack) {
          tracks.push(systemAudioTrack);
      } else if (enableSound && SoundEngine.dest) {
          // If no system audio shared, use our internal engine stream
          const internalTrack = SoundEngine.dest.stream.getAudioTracks()[0];
          if (internalTrack) tracks.push(internalTrack);
      }

      const combinedStream = new MediaStream(tracks);
      streamRef.current = combinedStream;

      // 3. Determine best supported codec
      const getBestMimeType = () => {
          const types = [
              "video/webm;codecs=vp9", 
              "video/webm;codecs=vp8", 
              "video/webm", 
              "video/mp4"
          ];
          for (const t of types) {
              if (MediaRecorder.isTypeSupported(t)) return t;
          }
          return "video/webm";
      };

      const selectedMimeType = getBestMimeType();
      const options = { mimeType: selectedMimeType, videoBitsPerSecond: 5000000 }; // 5 Mbps
      
      const mediaRecorder = new MediaRecorder(combinedStream, options);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      
      mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        // Cleanup tracks
        combinedStream.getTracks().forEach(t => t.stop());
        displayStream.getTracks().forEach(t => t.stop());

        // Download File
        const ext = selectedMimeType.includes('mp4') ? 'mp4' : 'webm';
        const blob = new Blob(chunksRef.current, { type: selectedMimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `MockMaster-${title.replace(/\s+/g, '_')}-${Date.now()}.${ext}`;
        a.click();
        URL.revokeObjectURL(url);
      };

      // Stop recording if user stops sharing via browser UI
      videoTrack.onended = () => {
          if (mediaRecorder.state !== 'inactive') {
              mediaRecorder.stop();
              setIsRecording(false);
          }
      };

      return mediaRecorder;
    } catch (err) {
      console.error("Capture setup failed:", err);
      // 'NotAllowedError' means user cancelled the prompt
      if ((err as any).name !== 'NotAllowedError') {
          alert("Could not start recording. Please check browser permissions.");
      }
      setIsRecording(false);
      return null;
    }
  };

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      // Ensure all tracks are stopped
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      setIsRecording(false);
    }
  }, []);

  const getStream = () => streamRef.current;

  return { setupRecording, stopRecording, isRecording, getStream };
};
