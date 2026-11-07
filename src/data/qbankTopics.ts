export interface QBankSubjectTopics {
  subjectId: string
  subjectName: string
  topics: string[]
}

export const QBANK_SUBJECT_TOPICS: Record<string, string[]> = {
  // 1. Anatomy
  anat: [
    'Embryology',
    'Histology',
    'Abdomen and Pelvis',
    'General Anatomy',
    'Head, Neck and Face',
    'Neuroanatomy',
    'Upper Limb',
    'Lower Limb',
    'Thorax',
    'Back',
  ],

  // 2. Biochemistry
  biochem: [
    'Carbohydrates',
    'Amino Acids and Proteins',
    'Lipids',
    'Enzymes and Porphyrins',
    'Clinical Biochemistry & Nutrition',
    'Genetics',
  ],

  // 3. Physiology
  physio: [
    'General Physiology',
    'Nerve Muscle Physiology',
    'Central Nervous System',
    'The Respiratory System',
    'The Cardiovascular System',
    'The Gastrointestinal Tract',
    'Renal Physiology',
    'Endocrine Physiology',
    'Reproductive Physiology',
    'Exercise Physiology',
  ],

  // 4. Pharmacology
  pharm: [
    'General Pharmacology',
    'Autonomic Nervous System',
    'Cardiovascular System',
    'Central and Peripheral Nervous System',
    'Antimicrobials',
    'Endocrine System',
    'Autacoids',
    'Hematology',
    'Respiratory System',
    'Gastrointestinal Drugs',
    'Anti-Neoplastic Agents',
  ],

  // 5. Microbiology
  micro: [
    'General Microbiology',
    'Bacteriology',
    'Virology',
    'Mycology',
    'Parasitology',
    'Applied Microbiology',
    'Immunology',
  ],

  // 6. Pathology
  path: [
    'General Pathology',
    'Hematology',
    'Cardiovascular System',
    'Genitourinary System',
    'Gastrointestinal System',
    'Respiratory System',
    'Endocrine System and Breast',
    'Skin and Musculoskeletal System',
    'Nervous System',
  ],

  // 7. Community Medicine
  psm: [
    'History of Medicine',
    'Concepts of Health and Disease',
    'Epidemiology',
    'Screening',
    'Epidemiology of Communicable Diseases',
    'Epidemiology of Non-Communicable Diseases',
    'Indian Health Programmes',
    'Demography and Family Planning',
    'Preventive Obstetrics, Paediatrics and Geriatrics',
    'Nutrition and Health',
    'Medicine and Social Sciences',
    'Environment and Health',
    'Biomedical Waste Management',
    'Disaster Management',
    'Occupational Health',
    'Communication for Health Education',
    'Healthcare of the Community',
    'International Health',
    'Biostatistics',
    'Mental Health and Genetics',
  ],

  // 8. Forensic Medicine
  fmt: [
    'Identification',
    'Medical Jurisprudence',
    'Death, PM Changes',
    'Medico Legal Autopsy',
    'Injuries',
    'Asphyxia',
    'Sexual Offences and Abortion',
    'Childhood Violence, Infanticide',
    'Toxicology',
  ],

  // 9. Ophthalmology
  opht: [
    'Basics of Ophthalmology',
    'Errors in Optics',
    'Conjunctiva',
    'Sclera',
    'Cornea',
    'Retina and Vitreous',
    'Lens',
    'Glaucoma',
    'Uveal Tract',
    'Lid and Lacrimal Apparatus',
    'Orbit',
    'Specific Disorders of the Eye',
    'Practical Ophthalmology',
    'Systemic Ophthalmology',
    'Community Ophthalmology',
    'Instruments',
  ],

  // 10. ENT
  ent: [
    'Ear',
    'Nose',
    'Pharynx',
    'Larynx',
    'Instruments',
  ],

  // 11. Anaesthesia
  anaesth: [
    'Preoperative Evaluation and Management',
    'Airway Management and Resuscitation',
    'Muscle Relaxants',
    'General Anaesthesia',
    'Local and Regional Anaesthesia',
    'Anaesthesia in Specific Conditions',
    'Complications of Anaesthesia',
  ],

  // 12. Dermatology
  derm: [
    'The Skin',
    'Clinical Dermatology',
    'Adnexa and Appendages',
    'Hair and Nails',
    'Skin Pigmentation',
    'Allergic Disorders & Dermatitis',
    'Papulosquamous Disorders',
    'Vesiculobullous Disorders',
    'Skin Infections & Infestations',
    'Sexually Transmitted Infections',
    'Genodermatoses & Nutritional Disorders',
    'Connective Tissue Disorders',
    'Skin Malignancies',
    'Skin in Systemic Disorders',
  ],

  // 13. Psychiatry
  psych: [
    'Facets of Psychiatry',
    'Clinical Psychiatry',
    'Neuropsychiatry',
    'Psychotic Disorders',
    'Neurocognitive Disorders',
    'Mood Disorders',
    'Substance-Related Disorders',
    'Neurosis',
    'Personality Disorders',
    'Specific Psychiatric Conditions',
    'Psychiatric Emergencies',
    'Sexuality',
    'Child Psychiatry',
    'Forensic Psychiatry',
  ],

  // 14. Radiology
  rad: [
    'Fundamentals of Radiology',
    'Diagnostic Radiology',
    'Radionuclide Imaging and Radiotherapy',
    'Emergency and Interventional Radiology',
  ],

  // 15. Medicine
  med: [
    'General',
    'Endocrine System',
    'Gastrointestinal System',
    'Rheumatology and Immunology',
    'Respiratory System',
    'Renal System',
    'Cardiovascular System',
    'Nervous System',
    'Blood Disorders',
    'Infectious Diseases',
    'Covid 19',
  ],

  // 16. Surgery
  surg: [
    'General Surgery',
    'Breast',
    'Endocrine System',
    'Upper GI Surgery',
    'Lower GI & Hernia Surgery',
    'Hepato-Biliary Surgery',
    'Spleen & Pancreatic Surgery',
    'Urology',
    'Neurosurgery',
    'Head and Neck',
    'Plastic Surgery',
    'Cardiothoracic & Vascular Surgery',
    'Skin',
  ],

  // 17. Orthopaedics
  ortho: [
    'Fracture and Its Complications',
    'Neck',
    'Upper Limb',
    'Lower Limb',
    'Spine & Pelvis',
    'Bone and Joint Infections',
    'Paediatric Orthopaedics',
    'Metabolic Bone Diseases',
    'Arthritis & Other Joint Disorders',
    'Nerve Injuries',
    'Bone Tumors',
    'Instruments in Orthopaedics',
    'Advanced Orthopaedics & Management',
  ],

  // 18. Paediatrics
  paed: [
    'Neonatology',
    'Growth and Development',
    'Nutrition',
    'Fluids and Electrolytes',
    'Genetic Disorders',
    'Metabolic Disorders',
    'Childhood Infections',
    'Gastrointestinal System',
    'Respiratory System',
    'Cardiovascular System',
    'Genito-Urinary System',
    'Neurology',
    'Endocrine System',
    'Childhood Malignancies',
    'Musculoskeletal System',
    'Paediatric Rheumatology',
    'Hematology',
  ],

  // 19. Obstetrics & Gynaecology
  obg: [
    'Fundamentals of Reproduction',
    'Normal Pregnancy and Antenatal Care',
    'Labor and Puerperium',
    'Obstetric Complications',
    'Medical and Surgical Complications',
    'General Gynaecology',
    'Gynaecologic Infections',
    'Infertility and Menopause',
    'Gynaecologic Oncology',
    'Instruments',
  ],
}

/** Helper to get topics for any subject id */
export function getQBankTopicsForSubject(subjectId: string): string[] {
  return QBANK_SUBJECT_TOPICS[subjectId] || []
}
