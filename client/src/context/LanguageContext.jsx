import React, { createContext, useContext, useState, useEffect } from 'react';

export const translations = {
  vi: {
    // Common & App
    appName: 'LearnBoard',
    appSubtitle: 'Bảng đen tương tác & Video Call 1-1 trực tiếp',
    langSelectLabel: 'Ngôn ngữ hiển thị:',
    langVi: 'Tiếng Việt',
    langEn: 'English',

    // Lobby / Welcome Screen
    roleTeacher: 'Người Dạy (Chủ Phòng)',
    roleStudent: 'Học Sinh Tham Gia Lớp',
    roleSpectator: 'Người theo dõi',
    roleTeacherDesc: 'Bạn đang mở lớp từ máy chủ (Localhost)',
    roleStudentDesc: 'Mã phòng được đồng bộ tự động từ người dạy',
    spectatorNamePrompt: 'Chọn tên hiển thị để tiếp tục vào lớp.',
    checkingRoom: 'Đang kiểm tra trạng thái lớp học...',
    roomCheckFailed: 'Không kiểm tra được trạng thái lớp. Máy chủ sẽ xác định vai trò khi bạn vào lớp.',
    spectatorMode: 'Chế độ theo dõi',
    spectatorWatching: 'Bạn đang xem lớp · {count} luồng',
    spectatorWaiting: 'Đang chờ luồng trực tiếp từ giáo viên và học sinh...',
    spectatorAudioOnly: 'Đang nhận âm thanh...',
    spectatorBoardReadOnly: 'Bảng chỉ xem · Kéo hoặc cuộn để di chuyển.',
    spectatorsTitle: 'Người theo dõi',
    noSpectators: 'Chưa có người theo dõi khác.',
    yourName: 'Tên hiển thị của bạn:',
    namePlaceholder: 'Nhập tên...',
    defaultTeacherName: 'Anh (Người dạy)',
    defaultStudentName: 'Em (Học sinh)',
    defaultFatherName: 'Cha (Phụ Huynh)',
    defaultMotherName: 'Mẹ (Phụ Huynh)',
    defaultOtherName: 'Khác (Phụ Huynh)',
    parentRoleLabel: 'Vai trò phụ huynh:',
    parentRoleFather: 'Cha',
    parentRoleMother: 'Mẹ',
    parentRoleOther: 'Khác',
    continueToClass: 'Tiếp tục vào lớp',
    spectatorNameRequired: 'Vui lòng nhập tên hiển thị.',
    kickUser: 'Mời người này ra khỏi lớp',
    confirmKickUser: 'Bạn có chắc chắn muốn mời người này ra khỏi lớp không?',
    kickedByTeacher: 'Bạn đã bị giáo viên {name} kick khỏi server.',
    roomId: 'Mã phòng học:',
    lockedAuto: 'Khóa tự động',
    roomIdStudentNote: 'Mã phòng được người dạy quy định và đồng bộ tự động.',
    badgeWebcam: 'Webcam 1-1',
    badgeRecord: 'Tự động Record',
    badgeOverlay: 'Vẽ đè bài tập',
    joinButton: 'Vào Lớp Học Ngay',
    joiningClass: 'Đang vào lớp...',
    joinFailed: 'Không thể kết nối vào lớp. Vui lòng thử lại.',

    // Blackboard
    boardGreen: 'Bảng Xanh',
    boardDark: 'Bảng Đen',
    switchBoardDark: '🔄 Bảng Đen',
    switchBoardGreen: '🔄 Bảng Xanh',
    switchBoardTitle: 'Bấm để đổi màu nền bảng',
    recPromptBanner: '📹 Bấm nút để ghi hình toàn bộ giao diện Web, camera và âm thanh bài giảng:',
    startTabRec: 'Bắt Đầu Ghi Hình Tab Web',
    recTabTitle: 'Bắt đầu ghi hình toàn bộ giao diện tab web (gồm camera, các item, đề bài, nét vẽ, âm thanh)',
    endClassBtn: 'Kết Thúc Buổi Học',
    endClassTitle: 'Dừng ghi hình & Lưu bài giảng vào thư mục lich-su-hoc-tap',
    zoomIn: 'Phóng to bảng',
    zoomOut: 'Thu nhỏ bảng',
    zoomReset: 'Đặt lại 100%',
    toolPen: 'Bút phấn viết chữ',
    toolHighlighter: 'Bút dạ quang highlight công thức',
    toolLaser: 'Bút Laser giảng bài (Vệt sáng tan dần)',
    toolLine: 'Thước kẻ đường thẳng',
    toolArrow: 'Mũi tên chỉ dẫn',
    toolRect: 'Hình chữ nhật',
    toolCircle: 'Hình tròn / Elip',
    toolText: 'Nhập văn bản / đề bài (Chỉnh cỡ chữ)',
    toolImage: 'Thêm ảnh bài tập (hoặc bấm Ctrl+V để dán ảnh)',
    toolEraser: 'Cục tẩy phấn',
    toolUndo: 'Hoàn tác nét vẽ (Ctrl+Z)',
    toolClear: 'Lau sạch toàn bộ bảng',
    toolExport: 'Tải ảnh bài giảng về máy',
    confirmClear: 'Bạn có chắc chắn muốn lau sạch toàn bộ bảng không?',
    fontSizeLabel: 'Cỡ chữ:',
    fontSmall: 'Nhỏ',
    fontNormal: 'Vừa',
    fontLarge: 'Lớn',
    fontXLarge: 'Rất Lớn',
    textInsertTitle: 'Chèn Văn Bản / Đề Bài',
    textPlaceholder: 'Nhập đề bài hoặc công thức toán...',
    textSubmit: '✍️ Viết Lên Bảng',
    dragExercise: 'Kéo đề bài',
    pinExercise: 'Ghim',
    pinTitle: 'Ghim cố định ảnh vào bảng để vẽ đè lên',
    unpinExercise: 'Bỏ ghim',
    unpinTitle: 'Ảnh đang ghim cố định. Bấm để Bỏ ghim và di chuyển',
    deleteExerciseTitle: 'Xóa ảnh đề bài',
    resizeExerciseTitle: 'Kéo góc để phóng to / thu nhỏ ảnh',
    classEndedTitle: 'BUỔI HỌC ĐÃ KẾT THÚC',
    classEndedDesc: 'Người dạy đã kết thúc buổi học trực tuyến. Cảm ơn em đã tham gia học tập chăm chỉ!',
    closeWebBtn: 'Đóng Trang Web Này',
    recordingSaved: 'Đã lưu video bài giảng:',

    // Video Overlay & Controls
    sharingLocalBanner: '📢 Bạn đang chia sẻ màn hình máy tính',
    sharingRemoteBanner: '📢 {name} đang chia sẻ màn hình!',
    openPopoutBtn: 'Mở Cửa Sổ Riêng Trên Cùng',
    openPopoutCardBtn: 'Mở Cửa Sổ Riêng',
    openPopoutTitle: 'Mở cửa sổ trình duyệt mới nổi lên trên cùng',
    callingPeer: 'Đang gọi: {name}',
    waitingStudent: 'Đang chờ em vào...',
    connecting: 'Đang kết nối...',
    shareLinkBtn: 'Gửi link',
    copiedLink: 'Đã copy!',
    shareLinkTitle: 'Copy link gửi qua Zalo cho em',
    collapseCamera: 'Thu nhỏ camera',
    expandCamera: 'Mở rộng camera',
    isSharingScreen: 'đang chia sẻ màn hình',
    camOff: 'Camera đang tắt',
    muteMic: 'Tắt Micro',
    unmuteMic: 'Bật Micro',
    turnOffCam: 'Tắt Camera',
    turnOnCam: 'Bật Camera',
    stopShareScreen: 'Dừng chia sẻ màn hình',
    shareScreen: 'Chia sẻ màn hình',
    notesAndChat: 'Ghi chú & Chat',
    praiseClap: '👏 Giỏi lắm',
    praise10: '⭐ 10 Điểm',
    praiseHeart: '❤️ Cố lên',
    praiseClapTitle: 'GIỎI LẮM! TIẾP TỤC PHÁT HUY! 👏',
    praiseClapSub: 'Câu trả lời rất thông minh và nhanh nhẹn!',
    praise10Title: '10 ĐIỂM XUẤT SẮC! ⭐',
    praise10Sub: 'Bài làm chính xác tuyệt đối, rất đáng khen!',
    praiseHeartTitle: 'CỐ LÊN NHÉ! BẠN LÀM ĐƯỢC MÀ! ❤️',
    praiseHeartSub: 'Đừng nản lòng, hãy tự tin làm từng bước nhé!',
    praisedByTag: '{name} khen tặng',
    chatTitle: 'Tin Nhắn & Ghi Chú',
    noMessages: 'Chưa có tin nhắn nào. Gửi câu hỏi hoặc công thức ở đây!',
    chatPlaceholder: 'Nhập tin nhắn...',
    sendBtn: 'Gửi',
    roleTeacherTag: 'Người dạy',
    roleStudentTag: 'Học sinh',
    waitingStudentCard: 'Chờ em bấm vào link...',
    connectingRoomCard: 'Đang kết nối phòng học...',
    copyLinkZalo: '📋 Copy link gửi Zalo',
    copiedLinkZalo: '✅ Đã copy link!'
  },
  en: {
    // Common & App
    appName: 'LearnBoard',
    appSubtitle: 'Interactive Blackboard & 1-on-1 Video Tutoring',
    langSelectLabel: 'Display Language:',
    langVi: 'Tiếng Việt',
    langEn: 'English',

    // Lobby / Welcome Screen
    roleTeacher: 'Teacher (Host)',
    roleStudent: 'Student (Participant)',
    roleSpectator: 'Spectator',
    roleTeacherDesc: 'Hosting session from local server (Localhost)',
    roleStudentDesc: 'Room ID is synchronized automatically from teacher',
    spectatorNamePrompt: 'Choose a display name to continue to the class.',
    checkingRoom: 'Checking classroom status...',
    roomCheckFailed: 'Could not check the classroom status. The server will assign your role when you join.',
    spectatorMode: 'Spectator mode',
    spectatorWatching: 'Watching class · {count} streams',
    spectatorWaiting: 'Waiting for the teacher and student live streams...',
    spectatorAudioOnly: 'Receiving audio...',
    spectatorBoardReadOnly: 'View only · Drag or scroll to move around the board.',
    spectatorsTitle: 'Spectators',
    noSpectators: 'No other spectators yet.',
    yourName: 'Your display name:',
    namePlaceholder: 'Enter your name...',
    defaultTeacherName: 'Teacher',
    defaultStudentName: 'Student',
    defaultFatherName: 'Father (Parent)',
    defaultMotherName: 'Mother (Parent)',
    defaultOtherName: 'Other (Parent)',
    parentRoleLabel: 'Parent role:',
    parentRoleFather: 'Father',
    parentRoleMother: 'Mother',
    parentRoleOther: 'Other',
    continueToClass: 'Continue to class',
    spectatorNameRequired: 'Please enter a display name.',
    kickUser: 'Remove this user from the classroom',
    confirmKickUser: 'Are you sure you want to remove this user from the classroom?',
    kickedByTeacher: 'You have been removed from the server by teacher {name}.',
    roomId: 'Classroom ID:',
    lockedAuto: 'Auto-locked',
    roomIdStudentNote: 'Room ID is configured by teacher and auto-synced.',
    badgeWebcam: '1-on-1 Webcam',
    badgeRecord: 'Auto Recording',
    badgeOverlay: 'Draw on Exercises',
    joinButton: 'Join Classroom Now',
    joiningClass: 'Joining class...',
    joinFailed: 'Could not connect to the classroom. Please try again.',

    // Blackboard
    boardGreen: 'Green Board',
    boardDark: 'Dark Board',
    switchBoardDark: '🔄 Dark Board',
    switchBoardGreen: '🔄 Green Board',
    switchBoardTitle: 'Click to switch chalkboard theme',
    recPromptBanner: '📹 Click button to record full web interface, camera and audio lecture:',
    startTabRec: 'Start Web Tab Recording',
    recTabTitle: 'Start recording full web tab (camera, items, exercises, drawings, audio)',
    endClassBtn: 'End Class Session',
    endClassTitle: 'Stop recording & save lecture video to lich-su-hoc-tap folder',
    zoomIn: 'Zoom in',
    zoomOut: 'Zoom out',
    zoomReset: 'Reset zoom (100%)',
    toolPen: 'Chalk Pen',
    toolHighlighter: 'Formula Highlighter',
    toolLaser: 'Teaching Laser Pointer (Fading neon glow)',
    toolLine: 'Ruler / Straight Line',
    toolArrow: 'Guide Arrow',
    toolRect: 'Rectangle',
    toolCircle: 'Circle / Ellipse',
    toolText: 'Insert Text / Exercise (Font size)',
    toolImage: 'Insert Exercise Image (or press Ctrl+V)',
    toolEraser: 'Chalk Eraser',
    toolUndo: 'Undo stroke (Ctrl+Z)',
    toolClear: 'Clear entire blackboard',
    toolExport: 'Download board snapshot (PNG)',
    confirmClear: 'Are you sure you want to clear the entire blackboard?',
    fontSizeLabel: 'Font size:',
    fontSmall: 'Small',
    fontNormal: 'Medium',
    fontLarge: 'Large',
    fontXLarge: 'Extra Large',
    textInsertTitle: 'Insert Text / Exercise',
    textPlaceholder: 'Enter exercise question or formula...',
    textSubmit: '✍️ Write on Board',
    dragExercise: 'Drag Exercise',
    pinExercise: 'Pin',
    pinTitle: 'Pin image to board background to draw on top',
    unpinExercise: 'Unpin',
    unpinTitle: 'Image is pinned. Click to unpin and move',
    deleteExerciseTitle: 'Delete exercise image',
    resizeExerciseTitle: 'Drag corner to resize image',
    classEndedTitle: 'CLASS SESSION ENDED',
    classEndedDesc: 'The teacher has ended this tutoring session. Thank you for your hard work!',
    closeWebBtn: 'Close This Window',
    recordingSaved: 'Saved lecture recording:',

    // Video Overlay & Controls
    sharingLocalBanner: '📢 You are sharing your screen',
    sharingRemoteBanner: '📢 {name} is sharing screen!',
    openPopoutBtn: 'Open Screen in Top Window',
    openPopoutCardBtn: 'Open in Window',
    openPopoutTitle: 'Open separate floating window on top',
    callingPeer: 'Call with: {name}',
    waitingStudent: 'Waiting for student to join...',
    connecting: 'Connecting...',
    shareLinkBtn: 'Share Link',
    copiedLink: 'Copied!',
    shareLinkTitle: 'Copy invite link to share',
    collapseCamera: 'Minimize camera',
    expandCamera: 'Expand camera',
    isSharingScreen: 'is sharing screen',
    camOff: 'Camera is off',
    muteMic: 'Mute Mic',
    unmuteMic: 'Unmute Mic',
    turnOffCam: 'Turn Off Camera',
    turnOnCam: 'Turn On Camera',
    stopShareScreen: 'Stop Screen Share',
    shareScreen: 'Share Screen',
    notesAndChat: 'Notes & Chat',
    praiseClap: '👏 Well Done',
    praise10: '⭐ Perfect 10',
    praiseHeart: '❤️ Keep It Up',
    praiseClapTitle: 'WELL DONE! KEEP UP THE GREAT WORK! 👏',
    praiseClapSub: 'Very smart and prompt response!',
    praise10Title: 'PERFECT 10! OUTSTANDING! ⭐',
    praise10Sub: 'Completely accurate solution, very commendable!',
    praiseHeartTitle: 'KEEP GOING! YOU CAN DO IT! ❤️',
    praiseHeartSub: "Don't give up, stay confident and take it step by step!",
    praisedByTag: 'Praise from {name}',
    chatTitle: 'Messages & Notes',
    noMessages: 'No messages yet. Send questions or formulas here!',
    chatPlaceholder: 'Type a message...',
    sendBtn: 'Send',
    roleTeacherTag: 'Teacher',
    roleStudentTag: 'Student',
    waitingStudentCard: 'Waiting for student to click link...',
    connectingRoomCard: 'Connecting to classroom...',
    copyLinkZalo: '📋 Copy invite link',
    copiedLinkZalo: '✅ Link copied!'
  }
};

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(() => {
    return localStorage.getItem('learnboard_lang') || 'vi';
  });

  const setLanguage = (lang) => {
    if (lang === 'vi' || lang === 'en') {
      setLanguageState(lang);
      try {
        localStorage.setItem('learnboard_lang', lang);
        document.documentElement.lang = lang;
      } catch (e) {}
    }
  };

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const t = (key, params = {}) => {
    const langDict = translations[language] || translations.vi;
    let text = langDict[key] || translations.vi[key] || key;
    if (params && typeof params === 'object') {
      Object.entries(params).forEach(([paramKey, val]) => {
        text = text.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), val);
      });
    }
    return text;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
