# Lativet Web

Lativet ahora es una **plataforma web local** para gestion veterinaria con:

- historias clinicas veterinarias,
- agenda de citas,
- consentimientos informados,
- base de datos SQLite local con respaldos,
- exportacion de PDF para consentimientos.

La interfaz esta hecha con `HTML`, `CSS` y `JavaScript`. El backend usa `Python + Flask + SQLite`.

## Referencia funcional

La reestructuracion toma como referencia la propuesta de valor publica de Okvet:

- historia clinica,
- gestion y administracion,
- agenda,
- recordatorios como siguiente capa del producto.

Referencia oficial consultada:

- https://okvet.co/

## Supuesto legal

Esta version mantiene una linea base operativa para Colombia, tomando como referencia:

- Ley 576 de 2000: https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=9025
- Gaceta Consejo Profesional MVZ 2020: https://consejoprofesionalmvz.gov.co/wp-content/uploads/2021/01/Gaceta-Consejo-Profesional-MVZ-2020.pdf
- SIC - Proteccion de datos personales: https://www.sic.gov.co/sobre-la-proteccion-de-datos-personales

Puntos importantes:

- la historia clinica incluye identificacion del responsable, del paciente, anamnesis, examen fisico, diagnosticos, plan, medicamentos, examenes, recomendaciones y profesional responsable;
- las historias finalizadas quedan bloqueadas para edicion directa;
- las novedades posteriores se agregan como evoluciones;
- hay registro separado de consentimiento informado;
- la retencion sigue en `15 anos` por solicitud del proyecto, aunque la referencia tecnica consultada para Colombia habla de una conservacion minima de `5 anos`.

## Como ejecutar

1. Instala dependencias:

   ```bash
   python -m pip install -r requirements.txt
   ```

2. Inicia el servidor web:

   ```bash
   python app.py
   ```

3. Abre en tu navegador:

   ```text
   http://127.0.0.1:8000
   ```

Variables utiles:

- `LATIVET_HOST` para cambiar el host.
- `LATIVET_PORT` para cambiar el puerto.
- `LATIVET_DEBUG=1` para modo debug.

## Base de datos

- Archivo principal: `data/lativet.sqlite3`
- Respaldos: `data/backups/`
- Exportaciones PDF: `data/exports/consents/`
- Motor: `SQLite` con `WAL`, indices y auditoria basica

Para un consultorio local o una clinica pequena, `SQLite` sigue siendo suficiente si se acompana de:

- copias de seguridad periodicas,
- control de acceso al equipo,
- cifrado del disco,
- politica de privacidad y retencion formal.

Si luego quieres multiusuario real en red o varias sedes concurrentes, conviene migrar a PostgreSQL y agregar autenticacion.

## Pruebas

Pruebas de humo del modelo y de la API web:

```bash
python -m unittest tests/test_database.py tests/test_web.py
```
