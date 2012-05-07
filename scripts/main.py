from subprocess import call

import signal
import sys
import glob
import os
import subprocess

default = '\033[37m'
red = '\033[31m'
green = '\033[32m'
magenta = '\033[35m'

processes = []

def signal_handler(signal, frame):
	print ''
	for process in processes:
		print red + 'KILL: ' + default + 'process ' + str(process.pid)
		process.kill()
	print green + 'Successful shutdown!'
	sys.exit(0)

print green + 'START:' + default + ' compile for app'
processes.append(subprocess.Popen(['sh', 'scripts/cljs-watch', 'src/app', 
'{:output-dir "public/js/app/out/" :output-to "public/js/app/app.js"}']))

print green + 'START:' + default + ' compile for server'
processes.append(subprocess.Popen(['sh', 'scripts/cljs-watch', 'src/server', 
'{:output-dir "out" :optimizations :simple :output-to "server.js" :target :nodejs}']))

signal.signal(signal.SIGINT, signal_handler)
print 'Press Ctrl+C to exit'
signal.pause()

