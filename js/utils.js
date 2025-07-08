// ฟังก์ชันช่วยเหลือต่างๆ

class Utils {
    // การจัดการ DOM
    static $(selector) {
        return document.querySelector(selector);
    }

    static $$(selector) {
        return document.querySelectorAll(selector);
    }

    static createElement(tag, className = '', textContent = '') {
        const element = document.createElement(tag);
        if (className) element.className = className;
        if (textContent) element.textContent = textContent;
        return element;
    }

    // การจัดการเวลา
    static formatDate(date, locale = 'th-TH') {
        if (typeof date === 'string') {
            date = new Date(date);
        }
        return date.toLocaleDateString(locale, {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    static formatDateTime(date, locale = 'th-TH') {
        if (typeof date === 'string') {
            date = new Date(date);
        }
        return date.toLocaleString(locale, {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    static timeAgo(date) {
        if (typeof date === 'string') {
            date = new Date(date);
        }
        
        const now = new Date();
        const diffInSeconds = Math.floor((now - date) / 1000);
        
        if (diffInSeconds < 60) return 'เมื่อสักครู่';
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} นาทีที่แล้ว`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} ชั่วโมงที่แล้ว`;
        if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)} วันที่แล้ว`;
        
        return this.formatDate(date);
    }

    // การจัดการข้อความ
    static truncate(text, maxLength = 100) {
        if (text.length <= maxLength) return text;
        return text.substr(0, maxLength) + '...';
    }

    static sanitizeHTML(str) {
        const temp = document.createElement('div');
        temp.textContent = str;
        return temp.innerHTML;
    }

    static capitalizeFirst(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    // การตรวจสอบข้อมูล
    static validateStudentId(studentId) {
        const pattern = /^[0-9]{5,10}$/;
        return pattern.test(studentId);
    }

    static validateEmail(email) {
        const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return pattern.test(email);
    }

    static validateThaiText(text) {
        const pattern = /^[ก-๏\s\-\.]+$/;
        return pattern.test(text);
    }

    // การจัดการฟอร์ม
    static getFormData(formElement) {
        const formData = new FormData(formElement);
        const data = {};
        
        for (let [key, value] of formData.entries()) {
            data[key] = value.trim();
        }
        
        return data;
    }

    static resetForm(formElement) {
        formElement.reset();
        
        // รีเซ็ต error states
        this.$$('.error', formElement).forEach(el => {
            el.classList.remove('error');
        });
        
        // รีเซ็ต validation messages
        this.$$('.validation-message', formElement).forEach(el => {
            el.remove();
        });
    }

    static showFieldError(fieldElement, message) {
        fieldElement.classList.add('error');
        
        // ลบข้อความเก่า
        const existingMessage = fieldElement.parentNode.querySelector('.validation-message');
        if (existingMessage) {
            existingMessage.remove();
        }
        
        // เพิ่มข้อความใหม่
        const messageElement = this.createElement('div', 'validation-message error-message', message);
        fieldElement.parentNode.appendChild(messageElement);
    }

    // การจัดการ Loading
    static showLoading(message = 'กำลังดำเนินการ...') {
        const overlay = this.$('#loadingOverlay');
        const text = this.$('#loadingText');
        
        if (overlay && text) {
            text.textContent = message;
            overlay.classList.add('active');
        }
    }

    static hideLoading() {
        const overlay = this.$('#loadingOverlay');
        if (overlay) {
            overlay.classList.remove('active');
        }
    }

    // การจัดการ Toast Notifications
    static showToast(message, type = 'info', duration = CONFIG.SETTINGS.TOAST_DURATION) {
        const toast = this.$('#toast');
        if (!toast) return;
        
        // รีเซ็ต classes
        toast.className = 'toast';
        toast.textContent = message;
        
        // เพิ่ม type class
        toast.classList.add(type);
        
        // แสดง Toast
        setTimeout(() => {
            toast.classList.add('show');
        }, 100);
        
        // ซ่อน Toast หลังจากระยะเวลาที่กำหนด
        setTimeout(() => {
            toast.classList.remove('show');
        }, duration);
    }

    // การจัดการข้อมูล Local Storage
    static saveToLocalStorage(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
            return true;
        } catch (error) {
            console.error('Error saving to localStorage:', error);
            return false;
        }
    }

    static loadFromLocalStorage(key, defaultValue = null) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : defaultValue;
        } catch (error) {
            console.error('Error loading from localStorage:', error);
            return defaultValue;
        }
    }

    static removeFromLocalStorage(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (error) {
            console.error('Error removing from localStorage:', error);
            return false;
        }
    }

    // การจัดการการส่งออกไฟล์
    static downloadFile(content, filename, mimeType = 'text/plain') {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.style.display = 'none';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        URL.revokeObjectURL(url);
    }

    static exportToCSV(data, filename) {
        if (!Array.isArray(data) || data.length === 0) {
            throw new Error('ไม่มีข้อมูลสำหรับส่งออก');
        }
        
        const headers = Object.keys(data[0]);
        const csvContent = [
            headers.join(','),
            ...data.map(row => 
                headers.map(header => {
                    const value = row[header] || '';
                    // Escape quotes and wrap in quotes if contains comma
                    return typeof value === 'string' && (value.includes(',') || value.includes('"'))
                        ? `"${value.replace(/"/g, '""')}"`
                        : value;
                }).join(',')
            )
        ].join('\n');
        
        // Add BOM for proper Thai character encoding
        const bom = '\ufeff';
        this.downloadFile(bom + csvContent, filename, 'text/csv;charset=utf-8');
    }

    // การจัดการสถิติ
    static calculateStats(records) {
        const total = records.length;
        const approved = records.filter(r => r.status === CONFIG.STATUS.APPROVED).length;
        const pending = records.filter(r => r.status === CONFIG.STATUS.PENDING).length;
        const rejected = records.filter(r => r.status === CONFIG.STATUS.REJECTED).length;
        
        return {
            total,
            approved,
            pending,
            rejected,
            approvalRate: total > 0 ? ((approved / total) * 100).toFixed(1) : 0,
            rejectionRate: total > 0 ? ((rejected / total) * 100).toFixed(1) : 0
        };
    }

    static getScoreDistribution(records) {
        const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        
        records.forEach(record => {
            if (record.score && distribution.hasOwnProperty(record.score)) {
                distribution[record.score]++;
            }
        });
        
        return distribution;
    }

    static getClassroomStats(records) {
        const stats = {};
        
        records.forEach(record => {
            const classroom = record.classroom;
            if (!stats[classroom]) {
                stats[classroom] = {
                    total: 0,
                    approved: 0,
                    totalScore: 0
                };
            }
            
            stats[classroom].total++;
            if (record.status === CONFIG.STATUS.APPROVED) {
                stats[classroom].approved++;
                stats[classroom].totalScore += parseInt(record.score) || 0;
            }
        });
        
        // คำนวณค่าเฉลี่ย
        Object.keys(stats).forEach(classroom => {
            const classStats = stats[classroom];
            classStats.averageScore = classStats.approved > 0 
                ? (classStats.totalScore / classStats.approved).toFixed(1)
                : 0;
        });
        
        return stats;
    }

    // การจัดการ URL และ Query Parameters
    static getQueryParam(param) {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get(param);
    }

    static setQueryParam(param, value) {
        const url = new URL(window.location);
        url.searchParams.set(param, value);
        window.history.replaceState({}, '', url);
    }

    // การจัดการ Error
    static handleError(error, context = '') {
        console.error(`Error in ${context}:`, error);
        
        let message = CONFIG.MESSAGES.ERROR.NETWORK;
        
        if (error.message) {
            if (error.message.includes('401') || error.message.includes('403')) {
                message = CONFIG.MESSAGES.ERROR.PERMISSION;
            } else if (error.message.includes('404')) {
                message = 'ไม่พบข้อมูลที่ต้องการ';
            } else if (error.message.includes('GitHub')) {
                message = CONFIG.MESSAGES.ERROR.GITHUB;
            }
        }
        
        this.showToast(message, 'error');
        
        // Log สำหรับ Debug
        if (CONFIG.DEBUG.ENABLED) {
            console.trace('Error trace:', error);
        }
    }

    // การจัดการ Animation
    static animateNumber(element, start, end, duration = 1000) {
        const startTime = performance.now();
        const difference = end - start;
        
        function updateNumber(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Easing function (ease-out)
            const easeOut = 1 - Math.pow(1 - progress, 3);
            const current = Math.round(start + (difference * easeOut));
            
            element.textContent = current;
            
            if (progress < 1) {
                requestAnimationFrame(updateNumber);
            }
        }
        
        requestAnimationFrame(updateNumber);
    }

    // การจัดการ Responsive
    static isMobile() {
        return window.innerWidth <= 768;
    }

    static isTablet() {
        return window.innerWidth > 768 && window.innerWidth <= 1024;
    }

    static isDesktop() {
        return window.innerWidth > 1024;
    }

    // การจัดการ Debug
    static log(message, level = 'info') {
        if (!CONFIG.DEBUG.ENABLED) return;
        
        const levels = ['debug', 'info', 'warn', 'error'];
        const currentLevelIndex = levels.indexOf(CONFIG.DEBUG.LOG_LEVEL);
        const messageLevelIndex = levels.indexOf(level);
        
        if (messageLevelIndex >= currentLevelIndex) {
            console[level](`[${level.toUpperCase()}] ${message}`);
        }
    }

    // การสร้าง UUID
    static generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    // การจัดการ Performance
    static debounce(func, wait, immediate) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                timeout = null;
                if (!immediate) func(...args);
            };
            const callNow = immediate && !timeout;
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
            if (callNow) func(...args);
        };
    }

    static throttle(func, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }
}

// ส่งออก Utils
if (typeof window !== 'undefined') {
    window.Utils = Utils;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = Utils;
}
