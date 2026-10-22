# Home y arranque en una TV ya rooteada

Los scripts de `tv/` son los componentes de una integración probada en webOS 5.
Son material para revisar y adaptar, no un instalador universal. El código original
del firmware permanece intacto; se usan archivos propios y montajes bind que se
reaplican al arrancar mediante los hooks de Homebrew Channel.

## Componentes

- `native.js` y `luna.js`: inventario, red y apertura verificada de canales.
- `show-home.sh`: abre la aplicación desde una regla local de Input Hook.
- `daemon.js`: escucha encendido, foco y ciclo de vida; abre Inicio+ y mantiene
  desactivado `general/homeAutoLaunch`. Sus reintentos son limitados.
- `prepare-home-visuals.js`: deriva overrides de las dos raíces QML de la TV. Mantiene
  su visibilidad y registro nativo, pero aplica opacidad cero al árbol visual.
- `50-inicio-home`: monta los overrides y una versión adaptada de `systemUi.js`.
- `55-inicio`: inicia un único supervisor. No reinicia SAM.

La regla de Input Hook utilizada consume Home físico y ejecuta `show-home.sh`.
Se configura localmente: no contiene una clave de emparejamiento.

`systemUi.js` y las raíces QML de LG no se incluyen. El hook 50 presupone que se ha
preparado en la TV un override compatible en
`/var/lib/inicio/home-overrides/systemUi.js`. No instales ese hook si falta esa
preparación. Comprueba las rutas y guarda una copia recuperable antes de intervenir.

## Instantáneas CRIU

Cambiar solo `visible` no basta en este firmware: LG lo modifica al abrir su Home.
Además, CRIU puede restaurar el árbol anterior desde memoria y saltarse el archivo
QML recién montado. En la instalación probada se apartaron de forma recuperable
solo las instantáneas de `com.webos.app.home` y `com.webos.app.fullhome`, y se
regeneraron después de aplicar opacidad cero a ambas raíces. No se borraron las
instantáneas de TV, entradas ni otros servicios.

No reinicies SAM durante la restauración del arranque: en esta generación puede
dejar ventanas inválidas y pantalla negra. Un `launch` aceptado tampoco prueba
que el nuevo contenido esté dibujado: comprueba el foco y una captura de pantalla.

## Recuperación

Conserva fuera de la app las raíces QML originales, keyfilter, regla Input Hook,
hooks y snapshots anteriores. Para volver a LG: aparta los hooks, detén el
supervisor, restaura Input Hook y los checkpoints originales, desmonta los
overrides, restaura `homeAutoLaunch` si corresponde y reinicia. Quitar solo los
montajes puede dejar las instantáneas transparentes activas.

## Validación

Prueba un arranque completo y encendido desde espera, Home desde varias apps,
ambas rutas nativas y el botón físico. Valida también la imagen: la app que informa
`getForegroundAppInfo` puede diferir de la ventana superpuesta visible. Una
actualización de firmware puede requerir adaptar la integración.


## Cierre opcional de apps en segundo plano

`performance.js` y `preload.js` deben acompañar a `daemon.js`. El cierre automático se activa
solo si existe `/var/lib/inicio/close-background-apps` al iniciar el supervisor.
Al cambiar de aplicación espera a que se estabilice el foco y cierra las apps de
usuario que quedaron detrás. Conserva Inicio+, la app en primer plano y los
componentes del sistema. Las páginas web se terminan mediante WebAppMgr y las
apps nativas mediante SAM. Un límite de reintentos evita ciclos de reapertura. Una comprobación cada diez
segundos sirve de respaldo cuando webOS omite el evento de ventana. El receptor
compartido AirPlay queda protegido para que el sistema no lo reinicie en bucle.

Este modo libera memoria, pero las apps cerradas cargan de nuevo al abrirlas.
Para desactivarlo, retira ese marcador local y reinicia únicamente el supervisor.
Los fondos y su rotación permanecen independientes de esta opción.


La misma opción desactiva la precarga automática de las apps de usuario instaladas
mediante configd y el gestor de precarga, sin desinstalarlas. Conserva Home, TV,
entradas, voz, asistentes y casting. Se respalda la lista anterior en
`/var/lib/inicio/preload-before.json`; se reaplica la política al arrancar y despertar.
Cerrar una app sin cambiar esta política permite que LG la recargue de nuevo.
Para revertir la política, restaura solo los valores originales de los IDs de
`preload-disabled.json` con `com.webos.service.config/setConfigs` y
`com.webos.service.preloadmanager/setPreloadPolicy`, conservando otros cambios.


Referencia de investigación del mecanismo de precarga:
[Glasshouse preload.js](https://github.com/rorygallagher2024/glasshouse/blob/main/server/lib/preload.js).
