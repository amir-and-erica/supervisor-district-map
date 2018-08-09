# SF District Supervisor map with Mapbox
Mapbox base map:  [Here](https://api.mapbox.com/styles/v1/bythebaydotcool/cjkk9y9mk5en52qmw32fh7uo7.html?fresh=true&title=true&access_token=pk.eyJ1IjoiYnl0aGViYXlkb3Rjb29sIiwiYSI6ImNqajh5eDEwbTMxOXIza3Q0dmhxNnowemkifQ.kgcdaQINw8_7719QVmmT-w#13.8/37.750205/-122.434012/0)

data from: [SF data](https://data.sfgov.org/Geographic-Locations-and-Boundaries/Current-Supervisor-Districts/8nkz-x4ny)

## To run locally
Clone into onto your local machine
```
git clone https://github.com/amir-and-erica/supervisor-district-map
```
Navigate to directory
```
cd supervisor-district-map
```

Install dependencies
```
npm install
```

Run python simple server
```python -m SimpleHTTPServer 8000```

navigate to `localhost:8000` in browser

## To develop locally
Requires browserify and watchify install
```
npm install -g browserify
npm install -g watchify
```
Make sure to run browserify if making changes to `app.js`
```
watchify app.js -o bundle.js -v
```
