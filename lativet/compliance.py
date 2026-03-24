from __future__ import annotations


def get_compliance_context() -> dict:
    return {
        "jurisdiction": "Colombia",
        "sources": [
            {
                "title": "Ley 576 de 2000",
                "url": "https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=9025",
                "summary": (
                    "Marco deontológico para medicina veterinaria y zootecnia. "
                    "Los artículos 26, 27 y 28 obligan a informar diagnóstico, riesgos, "
                    "pronóstico y pedir consentimiento en intervenciones y procedimientos "
                    "que afecten al animal."
                ),
            },
            {
                "title": "Gaceta Consejo Profesional MVZ 2020",
                "url": (
                    "https://consejoprofesionalmvz.gov.co/wp-content/uploads/2021/01/"
                    "Gaceta-Consejo-Profesional-MVZ-2020.pdf"
                ),
                "summary": (
                    "Documento técnico del Consejo Profesional que detalla características "
                    "de la historia clínica veterinaria, componentes mínimos, condiciones "
                    "de integralidad, secuencialidad, inmodificabilidad y conservación."
                ),
            },
            {
                "title": "SIC - Protección de datos personales",
                "url": "https://www.sic.gov.co/sobre-la-proteccion-de-datos-personales",
                "summary": (
                    "Referencia oficial para tratamiento de datos personales y sensibles "
                    "en Colombia. La información del propietario y los datos clínicos "
                    "deben manejarse con medidas de privacidad y acceso restringido."
                ),
            },
        ],
        "required_sections": [
            "Identificación del propietario o tenedor responsable",
            "Identificación completa del paciente animal",
            "Motivo de consulta",
            "Anamnesis y antecedentes clínicos relevantes",
            "Examen físico y hallazgos objetivos",
            "Diagnóstico presuntivo, diferencial y definitivo cuando aplique",
            "Procedimiento a seguir, medicamentos y exámenes paraclínicos",
            "Pronóstico, recomendaciones y plan de manejo",
            "Consentimiento informado cuando exista riesgo relevante o procedimiento invasivo",
            "Nombre, firma o constancia del profesional y matrícula profesional",
        ],
        "consent_required_for": [
            "Cirugías",
            "Anestesia o sedación",
            "Procedimientos diagnósticos invasivos",
            "Hospitalización con riesgos relevantes",
            "Eutanasia",
            "Tratamientos con riesgos o pronóstico reservado",
        ],
        "retention_policy_note": (
            "La referencia técnica consultada para Colombia habla de conservación mínima "
            "de cinco años desde la última atención o el fallecimiento. La aplicación "
            "queda configurada por defecto en 15 años porque fue el plazo pedido, pero "
            "ese valor debe ser validado con asesoría jurídica local y la política interna "
            "de tratamiento de datos de la clínica."
        ),
        "implementation_notes": [
            "Las historias finalizadas se bloquean para edición directa; las novedades posteriores se registran como evoluciones anexas.",
            "Se guarda una copia estructurada completa del formulario para preservar el contenido original.",
            "Se genera auditoría básica de creación, actualización, finalización y cambios de agenda.",
            "Se incluye respaldo local manual para reducir riesgo operativo en conservación de largo plazo.",
        ],
        "disclaimer": (
            "Esta implementación está alineada con la línea base normativa consultada, "
            "pero no sustituye revisión jurídica ni validación por el comité o asesor "
            "de cumplimiento de la clínica antes de entrar a producción."
        ),
    }
