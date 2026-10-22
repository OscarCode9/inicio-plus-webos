#!/bin/sh
# Both a short and a held physical HOME are consumed by Input Hook.
/usr/bin/luna-send -t 1 -a webosbrew -w 3500 luna://com.webos.applicationManager/launch '{"id":"com.gathin.tvhome"}' >/dev/null 2>&1
