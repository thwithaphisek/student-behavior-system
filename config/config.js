// การตั้งค่าระบบ - แก้ไขข้อมูลให้เป็นของคุณ
const CONFIG = {
    // การตั้งค่า GitHub
    GITHUB: {
        OWNER: 'thwithaphisek',                    // ✅ ชื่อผู้ใช้ GitHub ของคุณ
        REPO: 'student-behavior-system',           // ✅ ชื่อ Repository
        TOKEN: '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',            // ⬅️ ใส่ Personal Access Token ของคุณ
        
        // สำหรับ GitHub Projects v2
        PROJECT_V2_ID: 'PVT_kwHODQgXXc4A9YAX',    // ✅ Project V2 ID ที่ได้จาก GraphQL
        PROJECT_NUMBER: 8,                         // ✅ Project Number จาก URL
        
        // URLs (ไม่ต้องแก้)
        API_BASE: 'https://api.github.com',
        GRAPHQL_URL: 'https://api.github.com/graphql'
    },

    // การตั้งค่าผู้ดูแลระบบ
    ADMIN: {
        PASSWORD: 'admin1324',                     // รหัสผ่านผู้ดูแลระบบ
        SESSION_TIMEOUT: 3600000,                  // หมดเวลา Session (1 ชั่วโมง)
        MAX_LOGIN_ATTEMPTS: 3                      // จำนวนครั้งที่ผิดพลาดสูงสุด
    },

    // ข้อมูลห้องเรียน (ปรับตามโรงเรียนจริง)
    CLASSROOMS: [
        { grade: 1, rooms: 12, label: 'ม.1' },
        { grade: 2, rooms: 10, label: 'ม.2' },
        { grade: 3, rooms: 10, label: 'ม.3' },
        { grade: 4, rooms: 12, label: 'ม.4' },
        { grade: 5, rooms: 12, label: 'ม.5' },
        { grade: 6, rooms: 12, label: 'ม.6' }
    ],

    // การตั้งค่าคะแนน
    SCORE_OPTIONS: [
        { value: 1, label: '1 คะแนน - ดี', color: '#28a745' },
        { value: 2, label: '2 คะแนน - ดีมาก', color: '#20c997' },
        { value: 3, label: '3 คะแนน - ดีเยี่ยม', color: '#17a2b8' },
        { value: 4, label: '4 คะแนน - ยอดเยี่ยม', color: '#6f42c1' },
        { value: 5, label: '5 คะแนน - เป็นแบบอย่าง', color: '#fd7e14' }
    ],

    // การตั้งค่าทั่วไป
    SETTINGS: {
        MAX_BEHAVIOR_LENGTH: 500,                  // ความยาวสูงสุดของข้อความพฤติกรรม
        MAX_NAME_LENGTH: 100,                      // ความยาวสูงสุดของชื่อ
        MAX_STUDENT_ID_LENGTH: 10,                 // ความยาวสูงสุดของรหัสนักเรียน
        
        // การแสดงผล
        RECORDS_PER_PAGE: 10,                      // จำนวนรายการต่อหน้า
        AUTO_REFRESH_INTERVAL: 300000,             // รีเฟรชอัตโนมัติ (5 นาที)
        
        // การแจ้งเตือน
        TOAST_DURATION: 5000,                      // ระยะเวลาแสดง Toast (5 วินาที)
        
        // การส่งออกข้อมูล
        EXPORT_FORMAT: 'csv',                      // รูปแบบการส่งออก
        EXPORT_FILENAME_PREFIX: 'รายงานพฤติกรรมความดี'
    },

    // สถานะต่างๆ
    STATUS: {
        PENDING: 'pending',
        APPROVED: 'approved',
        REJECTED: 'rejected'
    },

    // ป้ายกำกับ (Labels) สำหรับ GitHub Issues
    LABELS: {
        BEHAVIOR_RECORD: 'behavior-record',
        PENDING: 'pending',
        APPROVED: 'approved',
        REJECTED: 'rejected',
        HIGH_SCORE: 'high-score',                  // สำหรับคะแนน 4-5
        URGENT: 'urgent'                           // สำหรับกรณีเร่งด่วน
    },

    // ข้อความต่างๆ
    MESSAGES: {
        SUCCESS: {
            REGISTER: '✅ ลงทะเบียนสำเร็จ! ข้อมูลถูกส่งไป GitHub แล้ว',
            APPROVE: '✅ อนุมัติเรียบร้อยแล้ว',
            REJECT: '❌ ปฏิเสธเรียบร้อยแล้ว',
            EXPORT: '📊 ส่งออกข้อมูลเรียบร้อยแล้ว',
            LOGIN: '🔓 เข้าสู่ระบบสำเร็จ'
        },
        ERROR: {
            NETWORK: '🌐 เกิดข้อผิดพลาดในการเชื่อมต่อ',
            AUTH: '🔐 รหัสผ่านไม่ถูกต้อง',
            VALIDATION: '⚠️ กรุณากรอกข้อมูลให้ครบถ้วน',
            GITHUB: '🐙 เกิดข้อผิดพลาดกับ GitHub API',
            PERMISSION: '🚫 ไม่มีสิทธิ์เข้าถึง'
        },
        INFO: {
            NO_RECORDS: 'ℹ️ ไม่พบข้อมูลที่ค้นหา',
            LOADING: '⏳ กำลังโหลดข้อมูล...',
            SEARCHING: '🔍 กำลังค้นหา...',
            PROCESSING: '⚙️ กำลังดำเนินการ...'
        }
    },

    // การตั้งค่าการพัฒนา (Development)
    DEBUG: {
        ENABLED: false,                            // เปิด/ปิดโหมด Debug
        LOG_LEVEL: 'error',                        // ระดับ Log: 'debug', 'info', 'warn', 'error'
        MOCK_DATA: false                           // ใช้ข้อมูลจำลองหรือไม่
    },

    // ข้อมูลโรงเรียน (สามารถปรับแต่งได้)
    SCHOOL: {
        NAME: 'โรงเรียนตัวอย่าง',                  // ⬅️ เปลี่ยนเป็นชื่อโรงเรียนจริง
        ADDRESS: '123 ถนนตัวอย่าง อำเภอตัวอย่าง จังหวัดตัวอย่าง 12345',
        PHONE: '02-123-4567',
        EMAIL: 'info@school.ac.th',
        WEBSITE: 'https://school.ac.th',
        LOGO: 'assets/images/school-logo.png'
    }
};

// ตรวจสอบการตั้งค่า
if (typeof window !== 'undefined') {
    // ตรวจสอบว่าได้ตั้งค่า GitHub Token หรือยัง
    if (CONFIG.GITHUB.TOKEN === 'YOUR_TOKEN_HERE') {
        console.warn('⚠️ กรุณาตั้งค่า GitHub Personal Access Token ใน config.js');
    }
    
    // ตรวจสอบว่าได้ตั้งค่า GitHub Username หรือยัง
    if (CONFIG.GITHUB.OWNER === 'your-username') {
        console.warn('⚠️ กรุณาตั้งค่า GitHub Username ใน config.js');
    }
    
    // แสดงข้อมูลการตั้งค่าในโหมด Debug
    if (CONFIG.DEBUG.ENABLED) {
        console.log('🔧 CONFIG loaded:', CONFIG);
    }
}

// ส่งออกการตั้งค่า
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
}
