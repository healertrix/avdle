# Wikidata queries for data/people.js

Run each against https://qlever.dev/api/wikidata (Accept: application/sparql-results+json), save the results as raw/people-main.json, raw/people-alias.json and raw/people-place.json, then run `node tools/build-people.mjs`.

## main

```sparql
PREFIX wd: <http://www.wikidata.org/entity/>
PREFIX wdt: <http://www.wikidata.org/prop/direct/>
PREFIX wikibase: <http://wikiba.se/ontology#>
PREFIX schema: <http://schema.org/>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
PREFIX p: <http://www.wikidata.org/prop/>
PREFIX psv: <http://www.wikidata.org/prop/statement/value/>
PREFIX wikibase2: <http://wikiba.se/ontology#>
SELECT ?p (SAMPLE(?sl) AS ?sls) (SAMPLE(?name) AS ?n) (SAMPLE(?desc) AS ?ds) (GROUP_CONCAT(DISTINCT STR(?b); SEPARATOR="|") AS ?bs) (SAMPLE(?bprec) AS ?bpr) (GROUP_CONCAT(DISTINCT STR(?d); SEPARATOR="|") AS ?dsd) (SAMPLE(?dprec) AS ?dpr) (SAMPLE(?bp) AS ?bps) (SAMPLE(?bc) AS ?bcs) (SAMPLE(?dp) AS ?dps) (SAMPLE(?dc) AS ?dcs) (SAMPLE(?img) AS ?imgs) (SAMPLE(?article) AS ?art) (SAMPLE(?gender) AS ?g) WHERE {
  ?p wdt:P31 wd:Q5 ; wikibase:sitelinks ?sl . FILTER(?sl >= 65)
  ?p wdt:P19 ?bp ; wdt:P20 ?dp ; wdt:P569 ?b ; wdt:P570 ?d .
  OPTIONAL { ?bp wdt:P625 ?bc1 } OPTIONAL { ?bp wdt:P131 ?bpa . ?bpa wdt:P625 ?bc2 }
  OPTIONAL { ?dp wdt:P625 ?dc1 } OPTIONAL { ?dp wdt:P131 ?dpa . ?dpa wdt:P625 ?dc2 }
  BIND(COALESCE(?bc1, ?bc2) AS ?bc) BIND(COALESCE(?dc1, ?dc2) AS ?dc) FILTER(BOUND(?bc) && BOUND(?dc))
  OPTIONAL { ?p p:P569/psv:P569/wikibase:timePrecision ?bprec }
  OPTIONAL { ?p p:P570/psv:P570/wikibase:timePrecision ?dprec }
  OPTIONAL { ?p rdfs:label ?nen FILTER(LANG(?nen) = "en") } OPTIONAL { ?p rdfs:label ?nmul FILTER(LANG(?nmul) = "mul") }
  BIND(COALESCE(?nen, ?nmul) AS ?name) FILTER(BOUND(?name))
  OPTIONAL { ?p schema:description ?desc FILTER(LANG(?desc) = "en") }
  OPTIONAL { ?p wdt:P18 ?img }
  OPTIONAL { ?p wdt:P21 ?gender }
  OPTIONAL { ?article schema:about ?p ; schema:isPartOf <https://en.wikipedia.org/> }
} GROUP BY ?p
```

## alias

```sparql
PREFIX wd: <http://www.wikidata.org/entity/>
PREFIX wdt: <http://www.wikidata.org/prop/direct/>
PREFIX wikibase: <http://wikiba.se/ontology#>
PREFIX schema: <http://schema.org/>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
PREFIX p: <http://www.wikidata.org/prop/>
PREFIX psv: <http://www.wikidata.org/prop/statement/value/>
PREFIX wikibase2: <http://wikiba.se/ontology#>
SELECT ?p (GROUP_CONCAT(DISTINCT ?alt; SEPARATOR="|") AS ?alts) WHERE {
  ?p wdt:P31 wd:Q5 ; wikibase:sitelinks ?sl . FILTER(?sl >= 65) ?p wdt:P570 ?dd ; wdt:P19 ?bp0 ; wdt:P20 ?dp0 .
  ?p skos:altLabel ?alt FILTER(LANG(?alt) = "en")
} GROUP BY ?p
```

## place

```sparql
PREFIX wd: <http://www.wikidata.org/entity/>
PREFIX wdt: <http://www.wikidata.org/prop/direct/>
PREFIX wikibase: <http://wikiba.se/ontology#>
PREFIX schema: <http://schema.org/>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
PREFIX p: <http://www.wikidata.org/prop/>
PREFIX psv: <http://www.wikidata.org/prop/statement/value/>
PREFIX wikibase2: <http://wikiba.se/ontology#>
SELECT ?pl (SAMPLE(?l) AS ?label) (SAMPLE(?al) AS ?admin) (GROUP_CONCAT(DISTINCT ?t; SEPARATOR="|") AS ?types) WHERE {
  { ?p wdt:P31 wd:Q5 ; wikibase:sitelinks ?sl . FILTER(?sl >= 65) ?p wdt:P570 ?dd ; wdt:P19 ?bp0 ; wdt:P20 ?dp0 . BIND(?bp0 AS ?pl) } UNION { ?p wdt:P31 wd:Q5 ; wikibase:sitelinks ?sl . FILTER(?sl >= 65) ?p wdt:P570 ?dd ; wdt:P19 ?bp0 ; wdt:P20 ?dp0 . BIND(?dp0 AS ?pl) }
  OPTIONAL { ?pl rdfs:label ?len FILTER(LANG(?len) = "en") } OPTIONAL { ?pl rdfs:label ?lmul FILTER(LANG(?lmul) = "mul") }
  BIND(COALESCE(?len, ?lmul) AS ?l) FILTER(BOUND(?l))
  OPTIONAL { ?pl wdt:P31 ?t }
  OPTIONAL { ?pl wdt:P131 ?a . OPTIONAL { ?a rdfs:label ?alen FILTER(LANG(?alen) = "en") } OPTIONAL { ?a rdfs:label ?almul FILTER(LANG(?almul) = "mul") } BIND(COALESCE(?alen, ?almul) AS ?al) }
} GROUP BY ?pl
```
