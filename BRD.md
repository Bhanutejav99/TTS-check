# Business Requirements Document (BRD) - MockMaster Pro / Creator Studio

## 1. Executive Summary
**MockMaster Pro** (also known as Creator Studio) is a web-based, interactive quiz broadcasting application designed to automate the creation of high-quality, engaging quiz content. Its primary value proposition is to generate cinematic, narrated quiz videos with synchronized audio, visual reveals, and screen recording capabilities entirely from the browser, effectively acting as an automated video generation SaaS for quiz content creators.

## 2. Project Description & Objectives
The goal of this application is to eliminate the manual labor involved in creating quiz-style short-form or long-form videos for social media. 

### Core Objectives:
* **Workflow Automation**: Take bulk quiz questions (via CSV) and instantly transform them into a ready-to-record broadcasting interface.
* **Cinematic Experience**: Deliver premium, responsive typography ("Hero Scale"), vibrant colors, and responsive progress timers that result in an engaging user experience (and ultimately viewer experience).
* **Automated Voice Integration**: Utilize state-of-the-art TTS services (ElevenLabs) to read out questions and answers, simulating a real live quiz host.
* **Browser-Native Recording**: Automatically record the quiz session in-browser to export a video, ready for publishing to platforms like YouTube, TikTok, or Instagram.

## 3. Product Phases and Workflow
The application revolves around a three-phase architecture defined by the `AppPhase` enum:

1. **UPLOAD / SETUP (`AppPhase.UPLOAD`)**
   * **Scope**: Users can import questions through a `CSVUploader`.
   * **Configuration**: After questions are imported, users configure the session:
     * **General**: Test Title, Layout Mode (Portrait or Landscape), and Theme Color.
     * **Automation**: Automatic play/transition vs Manual clicking.
     * **Media**: Toggle Sound Effects (Success/Error/Tick), Toggle TTS Engine, Toggle Screen Recording.

2. **QUIZ / BROADCAST (`AppPhase.QUIZ`)**
   * **Scope**: The main interactive interface. The system cycles through the questions sequentially based on the pre-defined constraints.
   * **Automated Reveal**: The system displays a progress bar. If automatic mode is active, the question is read aloud, the timer pauses for a "thinking gap", and then the correct answer is automatically highlighted exactly as the TTS says "The answer is...".
   * **Screen Recording**: Synchronizes an active screen recording (`useScreenRecorder` via MediaRecorder API and CropTarget) throughout the broadcast. 
   
3. **RESULT / REVIEW (`AppPhase.RESULT`)**
   * **Scope**: Displays user choices and calculates total accuracy based on automated progression or user interaction.

## 4. Functional Requirements
* **Data Ingestion**: Must accept CSV inputs mapping to a standard `Question` schema (`question`, `optionA`, `optionB`, `optionC`, `optionD`, `correctAnswer`, `imageUrl`, `timeLimit`).
* **Timer Mechanics**: Must calculate a dynamic timer that mathematically accounts for the TTS readout duration based on estimated words-per-second, ensuring sufficient time to read questions, pause, and reveal.
* **Audio & Voices**: 
  * Play sound effects to indicate low time (`playUrgentTick`, `playTick`) and answer accuracy.
  * Integration with ElevenLabs (Model: `eleven_v3`) strictly maintaining API limits. Must use sequential audio pre-fetching (`prefetchTTS`) to prevent API rate limiting (429 concurrency) and eliminate readout latency.
* **Video Capture Pipeline**: 
  * Provide native Screen Capture. 
  * Must support `CropTarget` for isolated region capture (avoiding recording user's browser tabs/window borders).

## 5. Non-Functional Requirements & Architecture
* **Performance / Stability**: Due to strict orchestration requirements between visual cues and network TTS, audio bytes must be eagerly fetched and stored in a local memory cache (`ttsCache`) as base64 buffers to prevent sync-lag mid-recording.
* **Technology Stack**: React 19, TypeScript, Vite, and TailwindCSS, relying heavily on modern absolute positioning and z-indexing to achieve a polished "studio" feel.
* **State Management**: Root state held in `App.tsx` handling the phase transitions and final user score aggregation, while individual components (like `QuizInterface.tsx`) handle intensive internal presentation logic (timers, refs, timeouts).

## 6. Future Scale Opportunities / Roadmap (Inferred)
1. Enhancing the pipeline to add more TTS options (currently integrating ElevenLabs and previously exploring Gemini TTS).
2. Advanced export mechanisms for the Screen Recorder (packaging audio/video cleanly without requiring user download interaction).
3. Back-end user profiles, saved templates, and history mapping.
