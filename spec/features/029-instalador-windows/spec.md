# 029 · Instalador de Windows

**Estado:** implementado; compilación y prueba en Windows real pendiente 🧪

## Qué hace

Agrega un instalador con asistente (`OpenTest-Setup-<versión>.exe`) como alternativa a copiar la carpeta `OpenTest-Windows` a mano (feature 010). El docente lo abre, elige (o acepta) la carpeta de instalación, y queda con accesos directos en el menú Inicio y, si lo marca, en el escritorio, más un desinstalador estándar de Windows visible en "Agregar o quitar programas". No pide permisos de administrador.

La copia manual de la carpeta sigue funcionando exactamente igual que hoy; el instalador es una comodidad adicional, no la reemplaza.

## Por qué

La 010 dejó esto explícitamente fuera de alcance ("se distribuye el ejecutable tal cual"), una decisión razonable mientras el producto estaba en construcción. Con el roadmap del encargo original completo y validado en el equipo destino, el punto de fricción que queda es distribuir a **más de un** equipo: copiar una carpeta a mano no dejaba accesos directos, no aparecía en "Agregar o quitar programas" y no daba una forma limpia de desinstalar. Un instalador de doble clic reduce ese trabajo a lo mismo que instalar cualquier otro programa de Windows.

## Criterios de aceptación

- [x] Existe un script de Inno Setup (`scripts/installer/opentest.iss`) que empaqueta `dist/OpenTest-Windows` (la salida de `npm run build:exe`, feature 010) en un instalador con asistente.
- [x] `npm run build:installer` valida que existe `dist/OpenTest-Windows`, se niega a correr fuera de Windows (mismo criterio que `build:exe`) y llama a `ISCC` con un mensaje claro si Inno Setup no está instalado.
- [x] El instalador no exige permisos de administrador (`PrivilegesRequired=lowest`): se instala en `%localappdata%\OpenTest` por defecto.
- [x] Crea accesos directos al ejecutable y a `GUIA-DOCENTE.md` en el menú Inicio, y opcionalmente uno en el escritorio.
- [x] Aparece en "Agregar o quitar programas" con un desinstalador funcional.
- [x] **Instalar sobre una copia existente con datos no borra `data\`**: el paquete del instalador excluye explícitamente esa carpeta (`Excludes: "data\*,data"` en `[Files]`), y el desinstalador de Inno solo borra lo que él mismo instaló — nunca archivos que no empaquetó.
- [ ] Verificado compilando con Inno Setup 6 real en Windows y probando instalar, actualizar (con datos ya cargados) y desinstalar. **Pendiente**: esta sesión de trabajo se hizo en Linux, sin Inno Setup ni Windows disponibles; el script se escribió y se revisó con cuidado pero no se compiló nunca. Queda para la próxima sesión de validación física, junto al resto de lo que ya espera equipo Windows real.

## Fuera de alcance

- **Firma de código**: el instalador (y el propio `OpenTest.exe`) no están firmados; Windows SmartScreen seguirá avisando la primera vez, igual que hoy con la copia manual. Firmar requiere un certificado de editor de software, un costo recurrente fuera del alcance de este proyecto.
- **Actualizaciones automáticas desde el instalador**: implicaría red, prohibida por `tech-stack.md`. Actualizar sigue siendo "genera un instalador nuevo y vuelve a instalar encima" (o reemplazar la carpeta a mano).
- **Publicar el instalador en algún sitio de descargas**: queda como archivo que el docente/administrador del colegio distribuye por USB, correo o la intranet, igual que ya se distribuye la carpeta hoy.
- **macOS/Linux**: sigue sin ser una plataforma soportada (ver 010).
