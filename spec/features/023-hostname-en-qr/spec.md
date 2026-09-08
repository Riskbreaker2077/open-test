# 023 · Hostname del equipo en la URL y el QR

**Estado:** implementado ✅

## Qué hace

El servidor de OpenTest, además de anunciar las direcciones IPv4 de cada
interfaz de red (como hoy), anuncia también la dirección que se puede
escribir usando el **nombre del equipo** — la que se anuncia por mDNS/
Bonjour en redes donde el sistema operativo lo soporta—. Si el portátil
del docente se llama `prueba`, las tablets pueden entrar con
`http://prueba:3000` o `http://prueba.local:3000` (la forma estándar de
mDNS), y el QR de la pantalla de proyección codifica esa URL por
encima de las IPs.

La URL por hostname se prefiere sobre las IPs porque es más fácil de
recordar, no cambia cuando el portátil se mueve de un punto de acceso
a otro, y se ve más "amigable" en la pantalla grande. Si la red no
tiene mDNS activo (algunas redes corporativas, ciertas redes de Windows
sin Bonjour instalado), el docente siempre puede caer al plan B: las
URLs por IPv4 que ya se imprimían hoy siguen ahí, intactas.

## Por qué

Antes, dictar la URL significaba leer "192.168.0.42, dos puntos, tres
mil" y repetirlo para 30 tablets. Si el portátil cambiaba de red (de
la sala de profesores al aula, del wifi al cable), la IP cambiaba y el
QR quedaba mintiendo: las tablets que escanearan después del cambio
recibían un 404. Con el hostname, mientras el SO del portátil siga
anunciando `prueba.local` por mDNS, el QR sigue siendo válido: la
dirección no depende de la subred.

## Criterios de aceptación

### Lista de URLs al arrancar y al consultar `direccionPortal`

- [x] Al imprimir las direcciones al arrancar, y al pedir
      `urlsDeIntranet(...)` desde la pantalla de proyección
      (`/api/docente/proyeccion/:sesionId`), aparecen **una o dos**
      candidatas nuevas según el `os.hostname()` del equipo:
      - `http://<hostname>:3000` siempre que el hostname no sea vacío
        ni parezca una IPv4.
      - `http://<hostname>.local:3000` si el hostname **no** contiene
        ya un punto (es decir, es un nombre corto tipo `prueba`,
        `portatil-aula`).
- [x] Si el hostname ya viene como FQDN (`portatil.colegio.local`,
      `laptop.example.com`), no se duplica el `.local`: sólo aparece la
      forma tal cual.
- [x] Las candidatas por hostname salen **primero** en la lista, antes
      que cualquier IP. La primera de la lista sigue marcada como
      `probable: true` y es la que codifica el QR.
- [x] Las candidatas por IPv4 siguen apareciendo igual que antes, en el
      mismo orden de prioridad que ya tenían, para que el docente tenga
      plan B si mDNS no resuelve.
- [x] Si el portátil no reporta hostname (`os.hostname()` devuelve la
      cadena vacía) o devuelve algo que parece una IPv4, **no** se
      agregan candidatas nuevas — la lista es exactamente la de antes.

### Cartel de arranque

- [x] Cuando el hostname del equipo es corto y legible (sin guiones
      raros, ≤ 24 caracteres, sólo letras/dígitos/guiones), el cartel de
      arranque imprime una línea adicional:
      > El nombre de tu equipo es `prueba`. Las tablets pueden entrar
      > también por `http://prueba.local:3000` si la red tiene mDNS.
- [x] Si el hostname es raro (largo, con caracteres no estándar), el
      cartel imprime una versión de aviso sugiriendo cambiarlo en el
      sistema:
      > Tu equipo se llama `DESKTOP-7KQ3P9H`. Si prefieres un nombre
      > más corto, cámbialo en Configuración → Sistema → Acerca de
      > (Windows) o en `/etc/hostname` (Linux) y reinicia OpenTest.
- [x] El QR de la pantalla de proyección codifica siempre la candidata
      marcada como `probable` (que, con esta feature, será la de
      hostname cuando exista).

### Lo que NO hace

- No instala ni configura Bonjour/mDNS en el sistema operativo del
  docente. Si la red no resuelve `prueba.local`, las tablets caen a
  las IPs como hasta ahora.
- No genera certificados ni hace HTTPS. El puerto 3000 sigue siendo
  HTTP plano; el hostname es sólo una forma más legible de llegar al
  mismo servidor.
- No cambia el contrato del QR (`spec/contracts/qr-pantalla-proyeccion.md`
  no existe — el QR es sólo una imagen del texto de la URL).
- No hace discovery de impresoras, ni expone el nombre del equipo por
  ningún otro canal: ni en la respuesta JSON del panel ni en la
  cabecera HTTP.