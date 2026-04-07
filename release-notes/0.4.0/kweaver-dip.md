# KWeaver DIP 0.4.0 Release Notes



As OpenClaw continues to accelerate enterprise intelligence transformation, KWeaver DIP has fully upgraded its product positioning to **"Enterprise Digital Workforce Platform"** —Built on an organization-wide business knowledge network, KWeaver delivers scalable digital workers with autonomous execution and decision-making capabilities across business domains-driving end-to-end productivity transformation.

KWeaver DIP 0.4.0 focuses on digital worker capability building, with key upgrades across three areas: "Digital Worker Creation, Business Knowledge Network Construction, and Data Analyst."

---

## Highlights

**DIP Studio:** 
An enterprise platform for creating and managing digital workers. It provides digital worker configuration, skill management, and task execution capabilities. It supports natural language skill creation and work planning, with full traceability throughout task execution—helping organizations integrate digital workers into real business scenarios with lower barriers and higher controllability.

**BKN Creator:** 
A built-in, ready-to-use BKN Creator digital worker responsible for constructing the Business Knowledge Network. This release includes BKN Creator and data semantic governance skills, providing automatic completion of business information for database tables and fields based on data views, intelligent business object recognition, and support for creating domain knowledge networks from requirements documents—enabling organizations to rapidly put data to work in business scenarios.

**Data Analyst:** 
Officially releases the Smart Data Discovery and Smart Data Analysis skills. Built on these skills, the Data Analyst efficiently handles data query and analysis needs across the organization, covering the complete data analysis pipeline from intent recognition and data asset lookup to natural language querying. New core capabilities include intelligent intent routing, automatic decomposition of complex tasks, and user memory accumulation—significantly improving the responsiveness and intelligence of data services.

 


##  [DIP Studio]

DIP Studio is an enterprise platform for creating and managing digital workers. It supports continuous building and optimization of digital workers by defining job responsibilities, integrating knowledge and skills, and enabling autonomous planning and task execution—helping enterprises build intelligent, reasoning-capable, and executable 24/7 digital assistants.

**1.OpenClaw Visual Connection Configuration** 

Supports completing the connection configuration between DIP Studio and the OpenClaw runtime platform through a visual wizard. Users enter the OpenClaw gateway address and token, and the system automatically establishes a secure tunnel to complete service onboarding. Once connected, digital workers can be created and managed directly within DIP Studio.

**2.Digital Worker Definition and Configuration**

(1) Role Definition: Supports describing a digital worker's job responsibilities and role boundaries in natural language, constraining its capability scope and ensuring each digital worker operates autonomously within its designated role. Clear responsibility definitions help reduce out-of-scope responses and improve focus and reliability in business scenarios.

(2) Skill Configuration: Supports selecting existing skills from the Skills Hub, uploading skills, or quickly creating new skills via the "Skill Creation Assistant." Skills can be tested directly in the dialogue box to ensure sufficient validation before publishing. Published skills support version recording and release descriptions, and can be discovered and reused by other digital workers—continuously accumulating organizational skill assets.

(3) Knowledge Configuration: Supports mounting a Business Knowledge Network (BKN) to a digital worker, ensuring it always references the organization's real business knowledge when answering questions and executing tasks. The Business Knowledge Network organically integrates enterprise data assets, business rules, and domain knowledge—empowering digital workers to deeply understand business context and make more accurate, situation-appropriate judgments and responses in complex business scenarios.

**3.Unified Dialogue Entry and Session Management** 

Supports users initiating conversations with digital workers from the main dialogue box on the DIP Studio homepage, or targeting a specific digital worker via @mention. Users can also view historical session records to trace past conversations and reuse prior experience at any time.

**4.Work Planning and Task Execution**

(1) Create Work Plans: Supports users initiating plan creation via natural language commands. Digital workers automatically generate task plans based on user intent, supporting two modes: scheduled tasks (one-time execution at a specified time) and recurring tasks (cyclic execution at a set interval). Users can preview and test execution results before publishing with one click, significantly lowering the barrier to automated task creation.

(2) Observable Task Execution: Supports automatic task instance generation upon plan trigger, with complete records of the digital worker's reasoning, thinking, and skill invocation process. Execution results are automatically summarized to the "Work Plan - Results" page for users to review execution status and task outcomes at any time—enabling full traceability of business process automation.

**5.Skill Management** 

Supports skill management with two modes—built-in skills and custom skills—designed to drive continuous accumulation and efficient reuse of organizational skill assets. Built-in skills are ready to use out of the box, providing standardized capability support. Custom skills are flexibly created by administrators and support natural language creation or direct upload of .zip/.skill format skill packages. Created skills support in-session editing and deletion for skill governance and iterative optimization.

**6.File Upload** 

Supports uploading local files in the session page, including markdown and text formats. Digital workers can directly process and analyze uploaded content, delivering analytical conclusions based on real-time business materials and improving the efficiency of ad hoc data processing.

**7.Login Authentication** 

Supports a unified login authentication mechanism that connects DIP Studio with the system's user management. Standard users and administrators can log in directly with their system accounts, achieving unified account management across the platform. Users no longer need to maintain multiple sets of credentials, and administrators can handle permission control through the unified account system—reducing system onboarding and management costs.

**8.Streaming Output with Tool Result Display** 

Supports real-time display of tool invocation input parameters and output results during streaming output. Users can clearly observe each step of the digital worker's tool execution process, improving the transparency and observability of digital worker execution, and facilitating quick issue identification and skill configuration optimization.



## [BKN Creator]

BKN Creator is a platform built-in digital worker responsible for constructing the Business Knowledge Network. It supports both "bottom-up" and "top-down" pathways to drive Business Knowledge Network development, including business semantic completion and business object extraction based on data views, and automatic domain knowledge network construction from requirements documents.

**1.Pre-configured BKN Creator Digital Worker** 

The system comes pre-configured with the BKN Creator digital worker, which is ready to use out of the box—no additional configuration required to start Business Knowledge Network construction. This significantly lowers the adoption barrier for BKN Creator.

**2.Data Understanding and General Knowledge Network Construction**

(1) Automatic Completion of Business Information for Tables and Fields: Supports automatic identification and completion of business names, business roles, and business descriptions for tables and fields—based on a single data view or batch data views under a data source—enabling precise conversion from technical data to business semantics. This helps business teams quickly understand data meaning and reduces manual effort in data asset maintenance.

(2) Intelligent Business Object Recognition: Supports automatic identification and generation of business objects from data views. By generating business objects and matching associated attributes, this significantly reduces the cost of manual modeling and provides foundational support for constructing the organization's Business Knowledge Network.

***Note: The current version supports automatic business object recognition but does not yet support automatic general knowledge network construction.***

(3) Understanding Enhancement via Sample Data and Knowledge Entries: Supports enhancing the data understanding process by incorporating sample data and knowledge entries, effectively improving the accuracy and reliability of business name recognition and business description generation—ensuring that auto-completed results are more aligned with actual business scenarios.

**3.Automated Domain Knowledge Network Creation** 

Supports automated domain knowledge network construction driven by natural language dialogue. After the user inputs a requirements document, BKN Creator automatically performs document structure analysis and domain recognition, extracts business objects, relationship types, and core fields from entity-relationship and other perspectives, extracts key business rules, constructs a complete data association and lineage chain, and ultimately generates a deployable domain knowledge network.

**4.Release of BKN Creator Related Skills**

This release includes the BKN Creator skill package, containing two core skills:

- Data Semantic Skill: Focused on data semantic understanding and automated business object extraction. Supports batch processing of views under a data source via Python scripts, improving data understanding efficiency and reducing manual effort in data asset maintenance.

- BKN Creator Skill: A full lifecycle orchestrator for Business Knowledge Networks, providing a rigorous and efficient management framework for creating, updating, querying, deleting, and extracting business knowledge networks. It follows a progressive "Identify - Preview - Confirm - Execute - Validate - Report" process with multi-layer confirmation gates at each step, ensuring every operation has explicit user authorization and effectively preventing AI hallucinations and misoperations.



## [Data Analyst]

Officially releasing the Smart Data Discovery and Smart Data Analysis skills to provide capability support for data analysis scenarios. Supports rapidly building a Data Analyst digital worker based on these skills—giving every business user a dedicated, always-available data analysis assistant. Capability enhancements for data discovery and querying also improve the organization's data service capabilities and response efficiency.

**1.Build a Role-Specific Data Analyst** 

Supports rapid deployment of a Data Analyst digital worker by defining job responsibilities, configuring Smart Data Discovery and Smart Data Analysis skills, and connecting to the Business Knowledge Network—enabling data discovery and querying capabilities and helping organizations deploy data service capabilities with lower barriers and in shorter cycles.

**2.Intelligent Intent Recognition and Routing** 

Supports precise identification of user query intent and automatically invokes the corresponding data processing capability—including data querying, data analysis, data visualization, and data interpretation. Users do not need to manually select skills; simply stating the requirement yields results directly.

**3.Proactive Clarification for Ambiguous Queries**

When a user's request is unclear or ambiguous and the core intent cannot be accurately identified (e.g., the target data object is unclear, the intent is vague, or information is incomplete), the system proactively asks targeted follow-up questions to guide the user in providing key information—avoiding result deviations caused by unclear requirements and ensuring every business question receives an effective answer.

**4.Automatic Task Decomposition** 

Supports automatically decomposing complex business problems into ordered, executable task steps. The system tracks task execution status throughout, evaluates results in real time, dynamically adjusts subsequent plans, and automatically skips invalid steps. Execution results are persistently saved and can be reused when a task is resumed or re-executed—ensuring complex tasks do not lose progress due to interruption.

**5.Continuous User Memory Accumulation:** Supports automatic accumulation of user preferences and business rules, proactively recalling relevant memories in each conversation to assist with question understanding—users do not need to repeatedly describe business context. When users provide additional information or feedback on results, memory is automatically updated, effectively improving semantic continuity across multi-turn dialogues. Coherent context can extend beyond 5 turns, significantly improving comprehension accuracy and response quality in long conversations.

**6.Multi-Dimensional Data Discovery by Data Attributes** 

Supports multi-dimensional data lookup using data attribute fields (e.g., information system, department, whether open, etc.), including querying related attributes based on known attribute information or directly locating corresponding data tables based on attribute conditions. This helps business users quickly pinpoint the information they need via business attributes, lowering query barriers.

**7.Intelligent Data Requirement Recommendations** 

Based on the user's described business scenario, the system intelligently recommends the required Data Sources types and owning departments, and matches existing data resources in the platform. It simultaneously identifies currently available data, data yet to be supplemented, and their acquisition channels—helping business teams quickly identify data gaps in the early stages of data construction and reducing the upfront research cost of data consolidation.

**8.Gatekeeping Mechanism and Sensitive Operation Protection** 

Supports automatic gate checks at each stage of task execution to identify and intercept anomalies such as prompt dilution, incomplete information, and unmet execution conditions. After execution, results are automatically validated for completeness to prevent execution deviations or inaccurate results caused by missing information—improving the overall accuracy and reliability of task execution. Additionally, sensitive operations such as DELETE, UPDATE, INSERT, ALTER, and DROP are automatically identified and intercepted to prevent accidental or malicious operations from damaging data.

**9.Smart Data Discovery and Smart Data Analysis Skills**

- Smart Data Discovery Skill: Focused on data asset location. Through semantic search within the Business Knowledge Network, it not only accurately identifies target data assets but also reverse-queries their owning departments, responsible personnel, and more—clearly displaying data ownership. It also supports multi-dimensional filtering by data attribute fields and presents search results and data asset details in clear tabular format, helping users quickly locate data and understand the full picture.

- Smart Data Analysis Skill: Provides an intelligent data query and analysis experience, supporting the conversion of natural language into SQL queries that are executed to retrieve real business data. Further secondary computation can be performed via Python, with support for displaying the data analysis process and result data to ensure results are verifiable—enabling instant data insights and empowering business users to quickly gain data value.

---

### More Product Release Content

**DIP Studio:** https://github.com/kweaver-ai/kweaver-dip/tree/main/dip-studio

**Data Semantic Governance:** https://github.com/kweaver-ai/kweaver-dip/tree/main/dsg

**Data Analyst:** https://github.com/kweaver-ai/kweaver-dip/tree/main/chat-data

Release Date: 2026-04-03
