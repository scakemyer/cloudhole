package:
	mv .gitignore gitignore
	rm -rf web-ext-build
	web-ext build
	mv gitignore .gitignore
