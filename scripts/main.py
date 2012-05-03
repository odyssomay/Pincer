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

for infile in os.listdir('src/app/'):
	if infile.endswith('.cljs'):
		input_file = 'src/app/' + infile
		output = 'public/js/app/' + os.path.splitext(infile)[0] + '.js'
		print green +'START:' + default +  ' compile for ' + input_file + magenta + ' -> '+ default + output
		processes.append(subprocess.Popen(['sh', 'scripts/cljs-watch', input_file,
			'{:output-to "' + output + '" :output-dir "public/js/app/out"}']))

print green + 'START:' + default + ' compile for server'
processes.append(subprocess.Popen(['sh', 'scripts/cljs-watch', 'src/server', 
'{:output-dir "out" :optimizations :simple :output-to "server.js" :target :nodejs}']))

signal.signal(signal.SIGINT, signal_handler)
print 'Press Ctrl+C to exit'
signal.pause()

