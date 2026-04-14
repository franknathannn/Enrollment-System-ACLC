import base64
import zlib
import urllib.request
import os

diagrams = {
    "1_Student_Registration": """
graph TD
    %% Custom Styles
    classDef startend fill:#dbeafe,stroke:#3b82f6,stroke-width:2px,color:#1e3a8a,font-weight:bold;
    classDef process fill:#f8fafc,stroke:#cbd5e1,stroke-width:2px,color:#334155;
    classDef decision fill:#fef3c7,stroke:#f59e0b,stroke-width:2px,color:#92400e;
    classDef error fill:#fee2e2,stroke:#ef4444,stroke-width:2px,color:#991b1b;

    A([Start]):::startend --> B[Verify Identity]:::process
    B --> V1{Duplicate LRN?}:::decision
    V1 -->|Yes| ERR1([LRN Error]):::error
    V1 -->|No| C[Academic Profile]:::process
    
    C --> V2{Missing Fields?}:::decision
    V2 -->|Yes| ERR2([Form Error]):::error
    V2 -->|No| D[Family Info]:::process
    
    D --> E[Upload Docs]:::process
    E --> V3{Docs Valid?}:::decision
    V3 -->|No| ERR3([Upload Error]):::error
    V3 -->|Yes| F[Review & Submit]:::process
    
    F --> G{Bot Check?}:::decision
    G -->|Fail| ERR4([Captcha Error]):::error
    G -->|Pass| H[Submit App]:::process
    
    H --> I{Success?}:::decision
    I -->|No| ERR5([Server Error]):::error
    I -->|Yes| J[Get Tracking ID]:::process
    J --> K([Complete]):::startend
""",
    "2_Admin_Approval": """
graph TD
    %% Custom Styles
    classDef startend fill:#dbeafe,stroke:#3b82f6,stroke-width:2px,color:#1e3a8a,font-weight:bold;
    classDef process fill:#f8fafc,stroke:#cbd5e1,stroke-width:2px,color:#334155;
    classDef decision fill:#fef3c7,stroke:#f59e0b,stroke-width:2px,color:#92400e;

    A([Admin Login]):::startend --> B[View Pending]:::process
    B --> C[Review Details]:::process
    C --> D[Verify Docs]:::process
    D --> E{Decision?}:::decision
    
    E -->|Decline| F[Provide Feedback]:::process
    F --> G[Set Declined]:::process
    
    E -->|Approve| H[Set Approved]:::process
    
    G --> I[Auto Email Alert]:::process
    H --> I
    
    I --> J{Is Approved?}:::decision
    J -->|Yes| K[Auto-Assign Section]:::process
    J -->|No| L([Process End]):::startend
    
    K --> L
""",
    "3_QRCode_Attendance": """
graph TD
    %% Custom Styles
    classDef startend fill:#dbeafe,stroke:#3b82f6,stroke-width:2px,color:#1e3a8a,font-weight:bold;
    classDef process fill:#f8fafc,stroke:#cbd5e1,stroke-width:2px,color:#334155;
    classDef decision fill:#fef3c7,stroke:#f59e0b,stroke-width:2px,color:#92400e;
    classDef error fill:#fee2e2,stroke:#ef4444,stroke-width:2px,color:#991b1b;
    classDef db fill:#ecfdf5,stroke:#10b981,stroke-width:2px,color:#065f46;

    A([Teacher Login]):::startend --> B[Select Period]:::process
    B --> C{Entry Method?}:::decision
    
    C -->|Scan| D[Scan QR]:::process
    C -->|Manual| E[Manual Entry]:::process
    C -->|Live| F[Live Monitor]:::process
    
    D --> G{Valid ID?}:::decision
    G -->|No| ERR1([Invalid Error]):::error
    G -->|Yes| H[Record Status]:::process
    
    E --> H
    
    H --> I[(Sync to DB)]:::db
    I --> J{Notify Parents?}:::decision
    
    J -->|Yes| K[Send Alert]:::process
    J -->|No| L([Done]):::startend
    K --> L
    F --> D
""",
    "4_Enrollment_Status": """
graph TD
    %% Custom Styles
    classDef startend fill:#dbeafe,stroke:#3b82f6,stroke-width:2px,color:#1e3a8a,font-weight:bold;
    classDef process fill:#f8fafc,stroke:#cbd5e1,stroke-width:2px,color:#334155;
    classDef decision fill:#fef3c7,stroke:#f59e0b,stroke-width:2px,color:#92400e;
    classDef error fill:#fee2e2,stroke:#ef4444,stroke-width:2px,color:#991b1b;
    classDef db fill:#ecfdf5,stroke:#10b981,stroke-width:2px,color:#065f46;

    A([Start Check]):::startend --> B[Enter LRN & Data]:::process
    B --> C[(Query System)]:::db
    
    C --> D{Found?}:::decision
    D -->|No| ERR1([Not Found]):::error
    
    D -->|Yes| E{Status?}:::decision
    
    E -->|Pending| F[Show Pending]:::process
    
    E -->|Approved| G[Show Setup Portal]:::process
    G --> H{Has Account?}:::decision
    H -->|Yes| I[Go to Login]:::process
    H -->|No| J[Generate Token]:::process
    
    E -->|Rejected| K[Show Feedback]:::process
    K --> L[Click Fix App]:::process
    L --> M[Restore Data]:::process
    M --> N([Go to Step 1]):::startend
""",
    "5_ERD": """
erDiagram
    STUDENTS ||--o{ ATTENDANCE : has
    STUDENTS ||--o{ ATTENDANCE_EXCUSES : creates
    STUDENTS ||--o{ EDIT_REQUESTS : makes
    STUDENTS }|--|| SECTIONS : belongs_to
    TEACHERS ||--o{ SECTIONS : advises
    TEACHERS ||--o{ SCHEDULES : teaches
    TEACHERS ||--o{ CLASS_SUSPENSIONS : logs
    TEACHERS ||--o{ QUARTERLY_SUBMISSIONS : submits
    SECTIONS ||--o{ SCHEDULES : scheduled_for
    ROOMS ||--o{ SCHEDULES : hosts
    
    STUDENTS {
        uuid id PK
        string lrn
        string first_name
        string status
        uuid section_id FK
    }
    
    TEACHERS {
        uuid id PK
        string full_name
        string email
        boolean is_active
    }
    
    SECTIONS {
        uuid id PK
        string section_name
        string strand
        uuid adviser_id FK
    }
    
    ATTENDANCE {
        uuid id PK
        uuid student_id FK
        string status
        date date
    }
""",
    "6_DFD_Level_0": """
graph LR
    %% Custom Styles
    classDef entity fill:#dbeafe,stroke:#3b82f6,stroke-width:2px,color:#1e3a8a,font-weight:bold;
    classDef system fill:#ecfdf5,stroke:#10b981,stroke-width:2px,color:#065f46,font-weight:bold;

    Student((Student)):::entity
    Parent((Parent)):::entity
    Teacher((Teacher)):::entity
    Admin((Admin)):::entity
    
    System[Main System]:::system
    
    Student -->|Submit App| System
    Student -->|Search Status| System
    System -->|Setup Portal| Student
    
    Teacher -->|Scan QR| System
    Teacher -->|Submit Reqs| System
    System -->|View Sections| Teacher
    
    Admin -->|Review Apps| System
    Admin -->|Settings| System
    System -->|Analysis| Admin
    
    System -->|Alerts| Parent
"""
}

output_dir = r"C:\Users\Frank\Documents\Enrollment System\enrollment-system\scratch\charts"

if not os.path.exists(output_dir):
    os.makedirs(output_dir)

for name, code in diagrams.items():
    try:
        compressed = zlib.compress(code.encode('utf-8'), 9)
        b64 = base64.urlsafe_b64encode(compressed).decode('ascii')
        url = f"https://kroki.io/mermaid/png/{b64}"
        
        out_path = os.path.join(output_dir, f"{name}.png")
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req) as response, open(out_path, 'wb') as out_file:
            data = response.read()
            out_file.write(data)
        print(f"Downloaded {name}.png to {out_path}")
    except Exception as e:
        print(f"Failed {name}: {e}")
