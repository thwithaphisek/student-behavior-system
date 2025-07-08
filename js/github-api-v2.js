// การเชื่อมต่อกับ GitHub Projects v2 (GraphQL API)

class GitHubAPIv2 {
    constructor() {
        this.graphqlUrl = CONFIG.GITHUB.GRAPHQL_URL;
        this.restUrl = CONFIG.GITHUB.API_BASE;
        this.owner = CONFIG.GITHUB.OWNER;
        this.repo = CONFIG.GITHUB.REPO;
        this.token = CONFIG.GITHUB.TOKEN;
        this.projectId = CONFIG.GITHUB.PROJECT_V2_ID;
        
        this.headers = {
            'Authorization': `Bearer ${this.token}`,
            'Content-Type': 'application/json'
        };
    }

    // ส่ง GraphQL Query
    async graphqlRequest(query, variables = {}) {
        try {
            const response = await fetch(this.graphqlUrl, {
                method: 'POST',
                headers: this.headers,
                body: JSON.stringify({
                    query: query,
                    variables: variables
                })
            });

            const result = await response.json();
            
            if (result.errors) {
                throw new Error(`GraphQL Error: ${result.errors[0].message}`);
            }

            return result.data;
        } catch (error) {
            Utils.handleError(error, 'GraphQL Request');
            throw error;
        }
    }

    // ดึงข้อมูล Project และ Fields
    async getProjectInfo() {
        const query = `
            query($projectId: ID!) {
                node(id: $projectId) {
                    ... on ProjectV2 {
                        id
                        title
                        fields(first: 20) {
                            nodes {
                                ... on ProjectV2Field {
                                    id
                                    name
                                    dataType
                                }
                                ... on ProjectV2SingleSelectField {
                                    id
                                    name
                                    dataType
                                    options {
                                        id
                                        name
                                        color
                                    }
                                }
                            }
                        }
                    }
                }
            }
        `;

        return await this.graphqlRequest(query, { projectId: this.projectId });
    }

    // หา Field ID สำหรับ Status
    async getStatusFieldId() {
        const projectInfo = await this.getProjectInfo();
        const fields = projectInfo.node.fields.nodes;
        
        const statusField = fields.find(field => 
            field.name === 'Status' || field.name === 'สถานะ'
        );
        
        if (!statusField) {
            throw new Error('Status field not found in project');
        }
        
        return {
            fieldId: statusField.id,
            options: statusField.options || []
        };
    }

    // สร้าง Issue ใน Repository
    async createIssue(data) {
        const url = `${this.restUrl}/repos/${this.owner}/${this.repo}/issues`;
        
        const issueData = {
            title: this.formatIssueTitle(data),
            body: this.formatIssueBody(data),
            labels: ['behavior-record', 'pending']
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.token}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(issueData)
        });

        if (!response.ok) {
            throw new Error(`GitHub API Error: ${response.status}`);
        }

        return await response.json();
    }

    // เพิ่ม Issue ลงใน Project v2
    async addIssueToProject(issueNodeId, data) {
        // Step 1: เพิ่ม Item ลงใน Project
        const addItemMutation = `
            mutation($projectId: ID!, $contentId: ID!) {
                addProjectV2ItemById(input: {
                    projectId: $projectId
                    contentId: $contentId
                }) {
                    item {
                        id
                    }
                }
            }
        `;

        const addResult = await this.graphqlRequest(addItemMutation, {
            projectId: this.projectId,
            contentId: issueNodeId
        });

        const itemId = addResult.addProjectV2ItemById.item.id;

        // Step 2: อัปเดต Custom Fields
        await this.updateProjectFields(itemId, data);

        return itemId;
    }

    // อัปเดต Custom Fields ของ Item
    async updateProjectFields(itemId, data) {
        const projectInfo = await this.getProjectInfo();
        const fields = projectInfo.node.fields.nodes;

        // หา Field IDs
        const statusField = fields.find(f => f.name === 'Status');
        const scoreField = fields.find(f => f.name === 'คะแนน');
        const classField = fields.find(f => f.name === 'ห้องเรียน');
        const teacherField = fields.find(f => f.name === 'ครูผู้ลงทะเบียน');
        const dateField = fields.find(f => f.name === 'วันที่ส่ง');

        // อัปเดต Status
        if (statusField) {
            const pendingOption = statusField.options?.find(opt => 
                opt.name.includes('รออนุมัติ')
            );
            
            if (pendingOption) {
                await this.updateFieldValue(itemId, statusField.id, pendingOption.id, 'SINGLE_SELECT');
            }
        }

        // อัปเดต คะแนน
        if (scoreField && data.score) {
            await this.updateFieldValue(itemId, scoreField.id, parseFloat(data.score), 'NUMBER');
        }

        // อัปเดต ห้องเรียน
        if (classField && data.classroom) {
            const classOption = classField.options?.find(opt => 
                opt.name === data.classroom
            );
            
            if (classOption) {
                await this.updateFieldValue(itemId, classField.id, classOption.id, 'SINGLE_SELECT');
            }
        }

        // อัปเดต ครูผู้ลงทะเบียน
        if (teacherField && data.teacherName) {
            await this.updateFieldValue(itemId, teacherField.id, data.teacherName, 'TEXT');
        }

        // อัปเดต วันที่ส่ง
        if (dateField) {
            const currentDate = new Date().toISOString().split('T')[0];
            await this.updateFieldValue(itemId, dateField.id, currentDate, 'DATE');
        }
    }

    // อัปเดตค่าของ Field
    async updateFieldValue(itemId, fieldId, value, fieldType) {
        let mutation;
        let variables;

        switch (fieldType) {
            case 'SINGLE_SELECT':
                mutation = `
                    mutation($projectId: ID!, $itemId: ID!, $fieldId: ID!, $optionId: String!) {
                        updateProjectV2ItemFieldValue(input: {
                            projectId: $projectId
                            itemId: $itemId
                            fieldId: $fieldId
                            value: { singleSelectOptionId: $optionId }
                        }) {
                            projectV2Item {
                                id
                            }
                        }
                    }
                `;
                variables = {
                    projectId: this.projectId,
                    itemId: itemId,
                    fieldId: fieldId,
                    optionId: value
                };
                break;

            case 'NUMBER':
                mutation = `
                    mutation($projectId: ID!, $itemId: ID!, $fieldId: ID!, $number: Float!) {
                        updateProjectV2ItemFieldValue(input: {
                            projectId: $projectId
                            itemId: $itemId
                            fieldId: $fieldId
                            value: { number: $number }
                        }) {
                            projectV2Item {
                                id
                            }
                        }
                    }
                `;
                variables = {
                    projectId: this.projectId,
                    itemId: itemId,
                    fieldId: fieldId,
                    number: value
                };
                break;

            case 'TEXT':
                mutation = `
                    mutation($projectId: ID!, $itemId: ID!, $fieldId: ID!, $text: String!) {
                        updateProjectV2ItemFieldValue(input: {
                            projectId: $projectId
                            itemId: $itemId
                            fieldId: $fieldId
                            value: { text: $text }
                        }) {
                            projectV2Item {
                                id
                            }
                        }
                    }
                `;
                variables = {
                    projectId: this.projectId,
                    itemId: itemId,
                    fieldId: fieldId,
                    text: value
                };
                break;

            case 'DATE':
                mutation = `
                    mutation($projectId: ID!, $itemId: ID!, $fieldId: ID!, $date: Date!) {
                        updateProjectV2ItemFieldValue(input: {
                            projectId: $projectId
                            itemId: $itemId
                            fieldId: $fieldId
                            value: { date: $date }
                        }) {
                            projectV2Item {
                                id
                            }
                        }
                    }
                `;
                variables = {
                    projectId: this.projectId,
                    itemId: itemId,
                    fieldId: fieldId,
                    date: value
                };
                break;
        }

        return await this.graphqlRequest(mutation, variables);
    }

    // สร้างบันทึกพฤติกรรมความดี (Main Function)
    async createBehaviorRecord(data) {
        try {
            Utils.log('Creating behavior record in Projects v2', 'info');

            // 1. สร้าง Issue
            const issue = await this.createIssue(data);
            
            // 2. เพิ่มลงใน Project
            const itemId = await this.addIssueToProject(issue.node_id, data);

            Utils.log(`Created issue #${issue.number} and added to project`, 'info');
            
            return {
                ...issue,
                projectItemId: itemId
            };

        } catch (error) {
            Utils.handleError(error, 'createBehaviorRecord');
            throw error;
        }
    }

    // ดึงรายการ Items จาก Project
    async getProjectItems() {
        const query = `
            query($projectId: ID!) {
                node(id: $projectId) {
                    ... on ProjectV2 {
                        items(first: 50) {
                            nodes {
                                id
                                content {
                                    ... on Issue {
                                        id
                                        number
                                        title
                                        body
                                        state
                                        createdAt
                                        updatedAt
                                        url
                                    }
                                }
                                fieldValues(first: 10) {
                                    nodes {
                                        ... on ProjectV2ItemFieldTextValue {
                                            field {
                                                ... on ProjectV2Field {
                                                    name
                                                }
                                            }
                                            text
                                        }
                                        ... on ProjectV2ItemFieldNumberValue {
                                            field {
                                                ... on ProjectV2Field {
                                                    name
                                                }
                                            }
                                            number
                                        }
                                        ... on ProjectV2ItemFieldSingleSelectValue {
                                            field {
                                                ... on ProjectV2SingleSelectField {
                                                    name
                                                }
                                            }
                                            name
                                        }
                                        ... on ProjectV2ItemFieldDateValue {
                                            field {
                                                ... on ProjectV2Field {
                                                    name
                                                }
                                            }
                                            date
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        `;

        const result = await this.graphqlRequest(query, { projectId: this.projectId });
        return this.parseProjectItems(result.node.items.nodes);
    }

    // แปลงข้อมูล Project Items เป็นรูปแบบที่ใช้งานได้
    parseProjectItems(items) {
        return items.map(item => {
            const record = {
                projectItemId: item.id,
                id: item.content?.number,
                nodeId: item.content?.id,
                title: item.content?.title,
                body: item.content?.body,
                state: item.content?.state,
                createdAt: item.content?.createdAt,
                updatedAt: item.content?.updatedAt,
                url: item.content?.url
            };

            // แยกข้อมูลจาก fieldValues
            item.fieldValues.nodes.forEach(fieldValue => {
                const fieldName = fieldValue.field?.name;
                
                switch (fieldName) {
                    case 'Status':
                    case 'สถานะ':
                        record.status = fieldValue.name;
                        break;
                    case 'คะแนน':
                        record.score = fieldValue.number;
                        break;
                    case 'ห้องเรียน':
                        record.classroom = fieldValue.name;
                        break;
                    case 'ครูผู้ลงทะเบียน':
                        record.teacherName = fieldValue.text;
                        break;
                    case 'วันที่ส่ง':
                        record.submittedDate = fieldValue.date;
                        break;
                }
            });

            // แยกข้อมูลจาก title และ body
            this.parseIssueData(record);

            return record;
        });
    }

    // แยกข้อมูลจาก Issue title และ body
    parseIssueData(record) {
        if (record.title) {
            const titleMatch = record.title.match(/^.+?\s(.+?)\s\((.+?)\)\s-\s(.+?)$/);
            if (titleMatch) {
                record.fullName = titleMatch[1];
                record.studentId = titleMatch[2];
                if (!record.classroom) record.classroom = titleMatch[3];
            }
        }

        if (record.body) {
            const lines = record.body.split('\n');
            lines.forEach(line => {
                if (line.includes('**เลขที่:**')) {
                    record.studentNumber = line.replace(/.*\*\*เลขที่:\*\*\s*/, '').trim();
                }
                if (line.includes('**พฤติกรรมความดี:**')) {
                    const nextLineIndex = lines.indexOf(line) + 1;
                    if (nextLineIndex < lines.length) {
                        record.goodBehavior = lines[nextLineIndex].trim();
                    }
                }
            });
        }
    }

    // อัปเดตสถานะของ Item
    async updateItemStatus(itemId, newStatus) {
        const statusField = await this.getStatusFieldId();
        const statusOption = statusField.options.find(opt => 
            opt.name.includes(newStatus)
        );

        if (!statusOption) {
            throw new Error(`Status option not found: ${newStatus}`);
        }

        return await this.updateFieldValue(itemId, statusField.fieldId, statusOption.id, 'SINGLE_SELECT');
    }

    // ฟังก์ชันช่วยเหลือ
    formatIssueTitle(data) {
        const scoreEmoji = this.getScoreEmoji(data.score);
        return `${scoreEmoji} ${data.fullName} (${data.studentId}) - ${data.classroom}`;
    }

    formatIssueBody(data) {
        return `
## 📝 รายละเอียดพฤติกรรมความดี

### 👤 ข้อมูลนักเรียน
- **รหัสนักเรียน:** ${data.studentId}
- **เลขที่:** ${data.studentNumber}
- **ชื่อ-นามสกุล:** ${data.fullName}
- **ห้อง:** ${data.classroom}

### ✨ พฤติกรรมความดี
${data.goodBehavior}

### ⭐ การประเมิน
- **คะแนนที่ได้รับ:** ${data.score} คะแนน
- **ครูผู้ลงทะเบียน:** ${data.teacherName}
- **วันที่ส่ง:** ${Utils.formatDateTime(new Date())}

---
*ระบบลงทะเบียนพฤติกรรมความดี - ${CONFIG.SCHOOL.NAME}*
        `;
    }

    getScoreEmoji(score) {
        const emojis = { 1: '⭐', 2: '🌟', 3: '✨', 4: '💫', 5: '🏆' };
        return emojis[score] || '⭐';
    }

    // การส่งออกข้อมูล
    async exportRecords(format = 'csv') {
        try {
            const records = await this.getProjectItems();
            
            if (records.length === 0) {
                throw new Error('ไม่มีข้อมูลสำหรับส่งออก');
            }

            const exportData = records.map(record => ({
                'รหัสนักเรียน': record.studentId || '',
                'เลขที่': record.studentNumber || '',
                'ชื่อ-นามสกุล': record.fullName || '',
                'ห้อง': record.classroom || '',
                'พฤติกรรมความดี': this.extractBehaviorFromBody(record) || '',
                'คะแนน': record.score || '',
                'ครูผู้ลงทะเบียน': record.teacherName || '',
                'สถานะ': this.getStatusText(record.status),
                'วันที่ส่ง': Utils.formatDate(new Date(record.createdAt)),
                'วันที่อัปเดต': Utils.formatDate(new Date(record.updatedAt))
            }));

            const filename = `${CONFIG.SETTINGS.EXPORT_FILENAME_PREFIX}_${new Date().toISOString().split('T')[0]}.csv`;
            
            Utils.exportToCSV(exportData, filename);
            Utils.showToast(CONFIG.MESSAGES.SUCCESS.EXPORT, 'success');
            
        } catch (error) {
            Utils.handleError(error, 'exportRecords');
        }
    }

    // ดึงพฤติกรรมจาก Issue body
    extractBehaviorFromBody(record) {
        if (!record.body) return '';
        
        const lines = record.body.split('\n');
        let behaviorStarted = false;
        let behaviorText = '';
        
        for (const line of lines) {
            if (line.includes('### ✨ พฤติกรรมความดี')) {
                behaviorStarted = true;
                continue;
            }
            
            if (behaviorStarted) {
                if (line.startsWith('###')) {
                    break;
                }
                if (line.trim()) {
                    behaviorText += line.trim() + ' ';
                }
            }
        }
        
        return behaviorText.trim();
    }

    // แปลงสถานะเป็นข้อความไทย
    getStatusText(status) {
        const statusMap = {
            'รออนุมัติ': 'รออนุมัติ',
            'กำลังตรวจสอบ': 'กำลังตรวจสอบ',
            'อนุมัติแล้ว': 'อนุมัติแล้ว',
            'ไม่อนุมัติ': 'ไม่อนุมัติ'
        };
        return statusMap[status] || 'ไม่ทราบสถานะ';
    }
}

// ส่งออก GitHubAPIv2
if (typeof window !== 'undefined') {
    window.GitHubAPIv2 = GitHubAPIv2;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = GitHubAPIv2;
}
