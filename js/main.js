// JavaScript หลักของระบบ

class StudentBehaviorSystem {
    constructor() {
        this.api = new GitHubAPIv2();
        this.currentSection = 'register';
        this.adminLoggedIn = false;
        this.adminLoginAttempts = 0;
        this.autoRefreshInterval = null;
        
        this.init();
    }

    async init() {
        try {
            Utils.log('Initializing Student Behavior System', 'info');
            
            // ตรวจสอบการตั้งค่า
            this.validateConfig();
            
            // ตั้งค่า Event Listeners
            this.setupEventListeners();
            
            // สร้างตัวเลือกห้องเรียน
            this.generateClassroomOptions();
            
            // ตรวจสอบการเชื่อมต่อ GitHub (ถ้าไม่ใช่โหมด Mock)
            if (!CONFIG.DEBUG.MOCK_DATA) {
                // await this.api.testConnection();
            }
            
            // ตั้งค่าการรีเฟรชอัตโนมัติ
            this.setupAutoRefresh();
            
            Utils.log('System initialized successfully', 'info');
            Utils.showToast('ระบบพร้อมใช้งาน', 'success', 2000);
            
        } catch (error) {
            Utils.handleError(error, 'System initialization');
        }
    }

    validateConfig() {
        if (CONFIG.GITHUB.TOKEN === 'YOUR_TOKEN_HERE') {
            Utils.showToast('⚠️ กรุณาตั้งค่า GitHub Token ใน config.js', 'error', 10000);
        }
        
        if (CONFIG.GITHUB.OWNER === 'your-username') {
            Utils.showToast('⚠️ กรุณาตั้งค่า GitHub Username ใน config.js', 'error', 10000);
        }
    }

    setupEventListeners() {
        // ฟอร์มลงทะเบียน
        const registerForm = Utils.$('#registerForm');
        if (registerForm) {
            registerForm.addEventListener('submit', (e) => this.handleRegisterSubmit(e));
        }

        // ช่องพฤติกรรม - นับตัวอักษร
        const behaviorTextarea = Utils.$('#goodBehavior');
        if (behaviorTextarea) {
            behaviorTextarea.addEventListener('input', this.updateCharCounter);
        }

        // ปุ่มค้นหาสถานะ
        const searchButton = Utils.$('.search-btn');
        if (searchButton) {
            searchButton.addEventListener('click', () => this.searchStatus());
        }

        // กดเข้าที่ช่องค้นหา
        const searchInput = Utils.$('#searchStudentId');
        if (searchInput) {
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.searchStatus();
                }
            });
        }

        // ปุ่มเข้าสู่ระบบผู้ดูแล
        const loginButton = Utils.$('.login-btn');
        if (loginButton) {
            loginButton.addEventListener('click', () => this.adminLogin());
        }

        // กดเข้าที่ช่องรหัสผ่าน
        const passwordInput = Utils.$('#adminPassword');
        if (passwordInput) {
            passwordInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.adminLogin();
                }
            });
        }

        // Navigation
        Utils.$$('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const section = e.target.getAttribute('data-section');
                if (section) {
                    this.showSection(section);
                }
            });
        });

        // ปุ่มอื่นๆ
        this.setupButtonListeners();
        
        // Responsive handlers
        window.addEventListener('resize', Utils.debounce(() => {
            this.handleResize();
        }, 250));
    }

    setupButtonListeners() {
        // Export button
        document.addEventListener('click', (e) => {
            if (e.target.matches('.export-btn, [onclick="exportToExcel()"]')) {
                e.preventDefault();
                this.exportToExcel();
            }
        });

        // Refresh button
        document.addEventListener('click', (e) => {
            if (e.target.matches('.refresh-btn, [onclick="refreshData()"]')) {
                e.preventDefault();
                this.refreshAdminData();
            }
        });

        // Logout button
        document.addEventListener('click', (e) => {
            if (e.target.matches('.logout-btn, [onclick="adminLogout()"]')) {
                e.preventDefault();
                this.adminLogout();
            }
        });

        // Approve/Reject buttons
        document.addEventListener('click', (e) => {
            if (e.target.matches('.approve-btn')) {
                e.preventDefault();
                const recordId = this.extractRecordIdFromButton(e.target);
                if (recordId) this.approveRecord(recordId);
            }
            
            if (e.target.matches('.reject-btn')) {
                e.preventDefault();
                const recordId = this.extractRecordIdFromButton(e.target);
                if (recordId) this.handleRejectRecord(recordId);
            }
        });
    }

    generateClassroomOptions() {
        const classroomSelect = Utils.$('#classroom');
        if (!classroomSelect) return;

        classroomSelect.innerHTML = '<option value="">เลือกห้องเรียน</option>';

        CONFIG.CLASSROOMS.forEach(grade => {
            const optgroup = document.createElement('optgroup');
            optgroup.label = grade.label;

            for (let room = 1; room <= grade.rooms; room++) {
                const option = document.createElement('option');
                option.value = `${grade.grade}/${room}`;
                option.textContent = `${grade.grade}/${room}`;
                optgroup.appendChild(option);
            }

            classroomSelect.appendChild(optgroup);
        });
    }

    updateCharCounter(event) {
        const textarea = event.target;
        const counter = textarea.parentNode.querySelector('.char-counter');
        if (counter) {
            const length = textarea.value.length;
            const maxLength = CONFIG.SETTINGS.MAX_BEHAVIOR_LENGTH;
            counter.textContent = `${length}/${maxLength} ตัวอักษร`;
            
            if (length > maxLength * 0.9) {
                counter.style.color = '#dc3545';
            } else if (length > maxLength * 0.7) {
                counter.style.color = '#ffc107';
            } else {
                counter.style.color = '#6c757d';
            }
        }
    }

    showSection(sectionName) {
        // ซ่อนทุก section
        Utils.$$('.section').forEach(section => {
            section.classList.remove('active');
        });

        // เอา active class ออกจากปุ่ม nav
        Utils.$$('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
        });

        // แสดง section ที่เลือก
        const targetSection = Utils.$(`#${sectionName}`);
        if (targetSection) {
            targetSection.classList.add('active');
        }

        // เพิ่ม active class ให้ปุ่มที่คลิก
        const targetBtn = Utils.$(`[data-section="${sectionName}"]`);
        if (targetBtn) {
            targetBtn.classList.add('active');
        }

        this.currentSection = sectionName;

        // รีเซ็ตส่วนผู้ดูแลเมื่อเปลี่ยน section
        if (sectionName !== 'admin') {
            this.resetAdminSection();
        }

        // อัปเดต URL
        Utils.setQueryParam('section', sectionName);
    }

    async handleRegisterSubmit(event) {
        event.preventDefault();

        try {
            Utils.showLoading('กำลังส่งข้อมูล...');

            const formData = Utils.getFormData(event.target);
            
            // Validate ข้อมูล
            if (!this.validateRegisterForm(formData)) {
                return;
            }

            // ส่งข้อมูลไป GitHub
            let result;
            if (CONFIG.DEBUG.MOCK_DATA) {
                result = await this.mockCreateRecord(formData);
            } else {
                result = await this.api.createBehaviorRecord(formData);
            }

            // แสดงผลสำเร็จ
            this.showRegisterSuccess(result);
            
            // รีเซ็ตฟอร์ม
            Utils.resetForm(event.target);

        } catch (error) {
            this.showRegisterError(error);
        } finally {
            Utils.hideLoading();
        }
    }

    validateRegisterForm(data) {
        const errors = [];

        // ตรวจสอบรหัสนักเรียน
        if (!data.studentId || !Utils.validateStudentId(data.studentId)) {
            errors.push({ field: 'studentId', message: 'รหัสนักเรียนไม่ถูกต้อง (ต้องเป็นตัวเลข 5-10 หลัก)' });
        }

        // ตรวจสอบเลขที่
        if (!data.studentNumber || data.studentNumber < 1 || data.studentNumber > 50) {
            errors.push({ field: 'studentNumber', message: 'เลขที่ต้องอยู่ระหว่าง 1-50' });
        }

        // ตรวจสอบชื่อ
        if (!data.fullName || data.fullName.length < 2) {
            errors.push({ field: 'fullName', message: 'กรุณากรอกชื่อ-นามสกุล' });
        }

        // ตรวจสอบห้อง
        if (!data.classroom) {
            errors.push({ field: 'classroom', message: 'กรุณาเลือกห้องเรียน' });
        }

        // ตรวจสอบพฤติกรรม
        if (!data.goodBehavior || data.goodBehavior.length < 10) {
            errors.push({ field: 'goodBehavior', message: 'กรุณาอธิบายพฤติกรรมความดีอย่างน้อย 10 ตัวอักษร' });
        }

        // ตรวจสอบคะแนน
        if (!data.score || !CONFIG.SCORE_OPTIONS.some(option => option.value == data.score)) {
            errors.push({ field: 'score', message: 'กรุณาเลือกคะแนน' });
        }

        // ตรวจสอบชื่อครู
        if (!data.teacherName || data.teacherName.length < 2) {
            errors.push({ field: 'teacherName', message: 'กรุณากรอกชื่อครู/บุคลากร' });
        }

        // แสดง error
        if (errors.length > 0) {
            errors.forEach(error => {
                const field = Utils.$(`#${error.field}`);
                if (field) {
                    Utils.showFieldError(field, error.message);
                }
            });
            
            Utils.showToast('กรุณาแก้ไขข้อมูลที่ไม่ถูกต้อง', 'error');
            return false;
        }

        return true;
    }

    showRegisterSuccess(result) {
        const messageContainer = Utils.$('#registerMessage');
        if (messageContainer) {
            messageContainer.innerHTML = `
                <div class="success-message">
                    ${CONFIG.MESSAGES.SUCCESS.REGISTER}
                    ${result.html_url ? `<br><a href="${result.html_url}" target="_blank">ดูรายละเอียดใน GitHub</a>` : ''}
                </div>
            `;

            // ซ่อนข้อความหลัง 5 วินาที
            setTimeout(() => {
                messageContainer.innerHTML = '';
            }, 5000);
        }

        Utils.showToast(CONFIG.MESSAGES.SUCCESS.REGISTER, 'success');
    }

    showRegisterError(error) {
        const messageContainer = Utils.$('#registerMessage');
        if (messageContainer) {
            messageContainer.innerHTML = `
                <div class="error-message">
                    เกิดข้อผิดพลาด: ${error.message}
                </div>
            `;

            setTimeout(() => {
                messageContainer.innerHTML = '';
            }, 5000);
        }

        Utils.handleError(error, 'Register form submission');
    }

    async searchStatus() {
        const studentId = Utils.$('#searchStudentId').value.trim();
        const resultContainer = Utils.$('#statusResult');

        if (!studentId) {
            resultContainer.innerHTML = '<div class="error-message">❌ กรุณากรอกรหัสนักเรียน</div>';
            return;
        }

        if (!Utils.validateStudentId(studentId)) {
            resultContainer.innerHTML = '<div class="error-message">❌ รหัสนักเรียนไม่ถูกต้อง</div>';
            return;
        }

        try {
            Utils.showLoading('กำลังค้นหา...');

            let records;
            if (CONFIG.DEBUG.MOCK_DATA) {
                records = await this.mockGetStudentRecords(studentId);
            } else {
                const allRecords = await this.api.getProjectItems();
                records = allRecords.filter(record => 
                    record.studentId === studentId && 
                    (record.status === 'รออนุมัติ' || record.status === 'กำลังตรวจสอบ')
                );
            }

            this.displaySearchResults(records, resultContainer);

        } catch (error) {
            resultContainer.innerHTML = `<div class="error-message">เกิดข้อผิดพลาด: ${error.message}</div>`;
            Utils.handleError(error, 'Status search');
        } finally {
            Utils.hideLoading();
        }
    }

    displaySearchResults(records, container) {
        if (!records || records.length === 0) {
            container.innerHTML = `
                <div class="no-results">
                    <h3>ไม่พบข้อมูล</h3>
                    <p>ไม่พบข้อมูลพฤติกรรมความดีที่อยู่ในช่วงดำเนินการ</p>
                </div>
            `;
            return;
        }

        let html = '<div class="result-display"><h3>📋 ข้อมูลที่อยู่ในช่วงดำเนินการ</h3>';
        
        records.forEach(record => {
            const statusColor = this.getStatusColor(record.status);
            const statusText = this.getStatusText(record.status);
            const scoreEmoji = this.getScoreEmoji(record.score);

            html += `
                <div class="record-card ${record.status}">
                    <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 15px;">
                        <h4>${scoreEmoji} ${record.fullName}</h4>
                        <span style="color: ${statusColor}; font-weight: bold;">${statusText}</span>
                    </div>
                    
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px; margin-bottom: 15px;">
                        <div><strong>รหัสนักเรียน:</strong> ${record.studentId}</div>
                        <div><strong>ห้อง:</strong> ${record.classroom}</div>
                        <div><strong>คะแนน:</strong> ${record.score} คะแนน</div>
                        <div><strong>วันที่ส่ง:</strong> ${Utils.formatDate(new Date(record.createdAt))}</div>
                    </div>
                    
                    <div style="margin-bottom: 15px;">
                        <strong>พฤติกรรมความดี:</strong><br>
                        ${record.goodBehavior || 'ไม่ระบุ'}
                    </div>
                    
                    <div style="font-size: 14px; color: #666;">
                        <strong>ครูผู้ลงทะเบียน:</strong> ${record.teacherName}<br>
                        ${record.reason ? `<strong>หมายเหตุ:</strong> ${record.reason}` : ''}
                    </div>
                </div>
            `;
        });
        
        html += '</div>';
        container.innerHTML = html;
    }

    async adminLogin() {
        const password = Utils.$('#adminPassword').value;
        const messageContainer = Utils.$('#adminLoginMessage');

        if (!password) {
            messageContainer.innerHTML = '<div class="error-message">❌ กรุณากรอกรหัสผ่าน</div>';
            return;
        }

        if (this.adminLoginAttempts >= CONFIG.ADMIN.MAX_LOGIN_ATTEMPTS) {
            messageContainer.innerHTML = '<div class="error-message">❌ ล็อกอินผิดเกินกำหนด กรุณารอ 5 นาที</div>';
            return;
        }

        if (password === CONFIG.ADMIN.PASSWORD) {
            this.adminLoggedIn = true;
            this.adminLoginAttempts = 0;
            
            Utils.$('#adminLogin').style.display = 'none';
            Utils.$('#adminPanel').classList.add('active');
            messageContainer.innerHTML = '';
            
            Utils.showToast(CONFIG.MESSAGES.SUCCESS.LOGIN, 'success');
            
            // โหลดข้อมูลผู้ดูแล
            await this.loadAdminData();
