flowchart TD
    A[System Power On] --> B[Initialize ESP32]
    B --> C[Initialize RFID Reader RC522]
    C --> D[Initialize Fingerprint Sensor]
    D --> E[Initialize LCD Display]
    E --> F[Initialize Relay & Indicators]
    F --> G[Check Wi-Fi Connection]
    G --> H{Wi-Fi Connected?}
    
    H -->|Yes| I[Sync with Database]
    H -->|No| J[Continue in Offline Mode]
    I --> K[System Ready - Display Welcome]
    J --> K
    
    K --> L[Wait for RFID Card]
    L --> M{RFID Card Detected?}
    
    M -->|No| L
    M -->|Yes| N[Read RFID UID]
    N --> O[Display: Place Finger]
    O --> P[LED Indicator: Blue]
    
    P --> Q{Valid RFID UID?}
    Q -->|No| R[Access Denied]
    Q -->|Yes| S[Request Fingerprint]
    
    S --> T{Fingerprint Placed?}
    T -->|No| U[Timeout Counter]
    U --> V{Timeout Reached?}
    V -->|Yes| R
    V -->|No| T
    
    T -->|Yes| W[Scan Fingerprint]
    W --> X[Process Biometric Data]
    X --> Y{Fingerprint Match?}
    
    Y -->|No| Z[Increment Failed Attempts]
    Z --> AA{Max Attempts Reached?}
    AA -->|Yes| BB[Temporary Lockout]
    AA -->|No| S
    
    Y -->|Yes| CC[Dual Authentication Success]
    CC --> DD[Activate Relay - Unlock Door]
    DD --> EE[Green LED + Success Buzzer]
    EE --> FF[Display: Access Granted]
    FF --> GG[Log Entry with Timestamp]
    
    GG --> HH{Wi-Fi Available?}
    HH -->|Yes| II[Send Data to Cloud Database]
    HH -->|No| JJ[Store Locally in SPIFFS/SQLite]
    
    II --> KK[Wait 5 Seconds]
    JJ --> LL[Queue for Later Sync]
    LL --> KK
    
    KK --> MM[Deactivate Relay - Lock Door]
    MM --> NN[Clear Display]
    NN --> K
    
    R --> OO[Red LED + Error Buzzer]
    OO --> PP[Display: Access Denied]
    PP --> QQ[Log Failed Attempt]
    QQ --> RR{Wi-Fi Available?}
    RR -->|Yes| SS[Send Alert to Database]
    RR -->|No| TT[Store Alert Locally]
    SS --> UU[Wait 3 Seconds]
    TT --> UU
    UU --> K
    
    BB --> VV[Display: System Locked]
    VV --> WW[Wait Lockout Period]
    WW --> K
    
    %% Background Processes
    XX[Background: Sync Process] --> YY{Pending Local Data?}
    YY -->|Yes| ZZ{Wi-Fi Connected?}
    ZZ -->|Yes| AAA[Batch Upload to Database]
    AAA --> BBB[Mark as Synced]
    BBB --> CCC[Delete Local Copy]
    ZZ -->|No| DDD[Wait for Connection]
    YY -->|No| EEE[Monitor Connection]
    
    %% Error Handling
    FFF[System Error Detection] --> GGG{Critical Error?}
    GGG -->|Yes| HHH[Reset ESP32]
    GGG -->|No| III[Log Error & Continue]
    HHH --> A
    
    %% Styling
    classDef startEnd fill:#4CAF50,stroke:#2E7D32,stroke-width:3px,color:#fff
    classDef process fill:#2196F3,stroke:#1565C0,stroke-width:2px,color:#fff
    classDef decision fill:#FF9800,stroke:#E65100,stroke-width:2px,color:#fff
    classDef success fill:#4CAF50,stroke:#2E7D32,stroke-width:2px,color:#fff
    classDef error fill:#F44336,stroke:#C62828,stroke-width:2px,color:#fff
    classDef storage fill:#9C27B0,stroke:#6A1B9A,stroke-width:2px,color:#fff
    
    class A,K startEnd
    class B,C,D,E,F,N,O,P,S,W,X,CC,DD,EE,FF,GG,KK,MM,NN,OO,PP,QQ,UU,VV,WW process
    class H,M,Q,T,V,Y,AA,HH,RR,YY,ZZ,GGG decision
    class II,AAA,BBB,CCC success
    class R,Z,BB,SS,TT,VV error
    class I,J,JJ,LL,III storage