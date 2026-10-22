# Inicio+

Una Home tranquila para LG webOS: tus apps sobre paisajes reales, una bandeja de
cristal, información útil y navegación completa con el mando.

- Apps como vista principal, con TV y entradas en paneles separados.
- Inventario real de la televisión y selección de canales por su identificador.
- Wi-Fi o Ethernet actual, sin mostrar direcciones ni contraseñas.
- Clima actual, ocho horas futuras, lluvia y pronóstico de mañana.
- Estado opcional del Mac: conexión, espacio libre y renderizado detectado.
- Seis paisajes con atribución, vista previa, rotación y preferencias persistentes.
- Cruceta, OK, Atrás y Magic Remote; pasar el puntero no activa categorías.

Basado en [webos-vibehack](https://github.com/OmkarK97/webos-vibehack), de Gathin y
OmkarK97. Se conservan su licencia MIT y sus créditos. No está afiliado a LG o Apple.

## Alcance y requisitos

La integración nativa se ha probado en una instalación con webOS 5, Homebrew
Channel elevado y LG Input Hook. La interfaz está escrita sin librerías pesadas
y admite el Chromium antiguo de esa generación. Otras versiones de firmware
requieren revisar las rutas y el comportamiento de sus ventanas.

Este repositorio no rootea televisiones. La sustitución del botón Home y del
arranque requiere acceso root previamente configurado y es específica del
firmware. El instalador habitual actualiza únicamente la aplicación. Consulta
[la integración nativa y recuperación](docs/NATIVE.md) antes de cambiar ese sistema.

## Configuración e instalación

Necesitas Python 3, Node.js y la [CLI oficial de webOS TV](https://webostv.developer.lge.com/develop/tools/cli-installation).
Configura tu propio perfil de dispositivo con `ares-setup-device`.

Los archivos que terminan en `.local.js` se ignoran en Git y sobrescriben los
valores de ejemplo. Copia `app/config.js` a `app/config.local.js` para elegir tu
ciudad, coordenadas, zona IANA, desplazamiento UTC y apps preferidas. El ejemplo del repositorio
es Ciudad de México y no corresponde a una instalación privada.

Para una TV ya rooteada, configura `INICIO_TV_HOST` e `INICIO_SSH_KEY` solo en tu
terminal o gestor de secretos. Después:

```sh
python3 scripts/deploy_native.py
python3 scripts/sync_inventory.py
DEVICE=inicio-root ./install.sh
```

El primer comando instala únicamente las operaciones fijas de inventario,
sintonización y red. No altera Home ni el arranque. El segundo genera el inventario
local ignorado. Homebrew Channel debe estar elevado para que la TV consulte esas
operaciones. El perfil SSH y las credenciales se configuran fuera del repositorio.

Para revisar la interfaz en un navegador:

```sh
python3 -m http.server 8080 --directory app
```

Abre `http://localhost:8080`. Las apps reales y la red se consultan en la TV; el
navegador sirve para revisar el diseño. Los archivos locales opcionales pueden
producir avisos 404 si aún no los has creado.

## Clima y Mac

El clima se consulta directamente a [Open-Meteo](https://open-meteo.com/en/docs)
cada diez minutos. Las horas usan el desplazamiento UTC configurado; si tu ciudad
cambia de horario estacional, actualízalo. Una lectura antigua o un error se indica
como «Sin actualizar». Un dato ausente no se sustituye por cero.

El servicio opcional del Mac es de solo lectura:

```sh
python3 mac_status_server.py --tv "$INICIO_TV_HOST" --storage "$INICIO_STORAGE"
```

Crea `app/connection.local.js` con tu endpoint privado:

```js
window.INICIO_CONNECTION = {jobStatusUrl: 'http://MAC_HOST:8766/status'};
```

Sustituye `MAC_HOST` localmente. El servicio acepta únicamente la TV indicada y
loopback. No debe exponerse a Internet. Solo transmite capacidad y estado resumido;
las líneas de comandos y rutas de procesos permanecen en el Mac. «Sin conexión»
no prueba que el equipo esté apagado. La detección de render es una heurística de
procesos Remotion/FFmpeg, no un porcentaje de avance.

«Mis canales» puede usar un proveedor de estado propio que devuelva el contrato
`channels` de `app/studio.js`. No se distribuyen canales, trabajos, horarios,
registros de publicación ni integraciones personales. El servicio de ejemplo
incluye una lista de canales vacía.

## Pruebas

```sh
node --test tests/inicio-*.test.cjs
python3 -m unittest discover -s tests -p 'test_*.py'
```

## Privacidad y licencias

Esta publicación se generó con una lista explícita de archivos y un historial
nuevo: no contiene claves, direcciones de red privadas, SSID, inventarios reales,
capturas de la instalación, backups, firmware ni fuentes QML de LG. Los overrides
QML se derivan localmente en el dispositivo; no se redistribuyen.

Código bajo MIT. Fotografías con sus respectivas licencias Creative Commons en
[ATTRIBUTION.json](app/wallpapers/ATTRIBUTION.json); las variantes conservan esas
licencias. Inter incluye su SIL OFL. Los SVG de Simple Icons incluyen atribución;
las marcas pertenecen a sus titulares. No se incluyen salvapantallas de Apple.
