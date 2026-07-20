(function() {
  'use strict';

  var GITHUB_BASE = 'https://raw.githubusercontent.com/strideward/helpdesk-central/main';
  var cache = {};
  var loaded = false;

  function loadJSON(url) {
    if (cache[url]) return Promise.resolve(cache[url]);
    return fetch(url).then(function(r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.text();
    }).then(function(text) {
      try { return JSON.parse(text); } catch(e) {
        var idx = text.indexOf('}\n{');
        if (idx > 0) { text = text.substring(0, idx + 1); return JSON.parse(text); }
        idx = text.indexOf('}\r\n{');
        if (idx > 0) { text = text.substring(0, idx + 1); return JSON.parse(text); }
        throw e;
      }
    }).then(function(d) {
      cache[url] = d;
      return d;
    });
  }

  function extractProvince(location) {
    if (!location) return '';
    var parts = location.split(',').map(function(s) { return s.trim(); });
    return parts.length > 1 ? parts[1] : '';
  }

  function findCoursesForInstitution(name) {
    name = (name || '').trim();
    if (!name) return [];
    if (cache._courses && cache._courses[name]) return cache._courses[name];
    var nameLower = name.toLowerCase().replace(/\s*\([^)]*\)/g, '').trim();
    for (var key in cache._courses || {}) {
      var k = key.toLowerCase().replace(/\s*\([^)]*\)/g, '').trim();
      if (k === nameLower) return cache._courses[key];
    }
    for (var key in cache._courses || {}) {
      var k = key.toLowerCase().replace(/\s*\([^)]*\)/g, '').trim();
      if (k.indexOf(nameLower) >= 0 || nameLower.indexOf(k) >= 0) return cache._courses[key];
    }
    return [];
  }

  var loadingPromise = null;

  function doLoad() {
    var courses = {};
    return loadJSON(GITHUB_BASE + '/universities.json').then(function(uniData) {
      window.ALL_UNIVERSITIES = uniData.universities || uniData || [];
    }).catch(function() { console.warn('Failed to load universities'); }).then(function() {
      return loadJSON(GITHUB_BASE + '/subjects.json').then(function(subData) {
        window.ALL_SUBJECTS = subData;
      }).catch(function() { console.warn('Failed to load subjects'); });
    }).then(function() {
      return loadJSON(GITHUB_BASE + '/unisa.json').then(function(unisaData) {
        courses['University of South Africa'] = unisaData;
      }).catch(function() { console.warn('Failed to load UNISA courses'); });
    }).then(function() {
      cache._courses = courses;
      window.GO_COURSES = {};
      Object.keys(courses).forEach(function(key) {
        window.GO_COURSES[key] = courses[key];
      });
      window.findCoursesForInstitution = findCoursesForInstitution;
      document.dispatchEvent(new CustomEvent('go-courses-loaded', { detail: window.GO_COURSES }));
      return window.GO_COURSES;
    });
  }

  function loadAll() {
    if (!loadingPromise) loadingPromise = doLoad();
    return loadingPromise;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadAll);
  } else {
    loadAll();
  }

  window.loadGoCourses = loadAll;
  window.findCoursesForInstitution = findCoursesForInstitution;
  window.ALL_UNIVERSITIES = [];
  window.ALL_SUBJECTS = null;
  window.GO_COURSES = {};
})();