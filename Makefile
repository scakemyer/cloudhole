all: clean
	mkdir -p build
	git archive master | tar -x -C build
	$(MAKE) -C build build

clean:
	rm -rf build

build:
	web-ext build
