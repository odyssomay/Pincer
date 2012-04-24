
for filename in src/app/*
do
	if [ "${filename##*.}" == "cljs" ]; then
		output="public/js/app/$(basename ${filename%.*}).js"
		sh scripts/cljs-watch $filename '{:output-to "$output"}' &
	fi
done;

sh scripts/cljs-watch src/server '{:output-dir "out" :optimizations :simple :output-to "server.js" :target :nodejs}' 
