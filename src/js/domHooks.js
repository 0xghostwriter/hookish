var domHooks = {

  init: function() {

    var Taints = {};
    var HOOKISH_TAG = "34758";
    Taints.XHR_JSON_RESPONSE = HOOKISH_TAG + "_XHR_JSON_RES";

    var original_document_domain = document.domain;
    var track = {};
    track.domain = original_document_domain; // Irony Detected!-
    track.href = document.location.href; // This cannot be hooked in browsers today.
    track.customHook = [];
    track.xhr = [];
    track.ws = [];
    track.unsafeAnchors = [];

    track.customHook.add = function(obj, nature) {
      track.customHook.push(obj);
      console.log(obj, nature)
      console.log(obj.type + " called with value " + obj.data.slice(0, 100));
      obj.name = nature.toString();
      obj.domain = track.domain;
      obj.href = track.href;
      window.postMessage({
        type: "FROM_HOOKISH",
        'obj': obj
      }, "*");
    }


    track.xhr.add = function(obj) {
      track.xhr.push(obj);
      console.log(obj.method + "  " + obj.url);
      obj.name = 'xhr';
      obj.section = 'xhr';
      window.postMessage({
        type: "FROM_HOOKISH",
        'obj': obj
      }, "*");
    }

    track.unsafeAnchors.add = function(obj) {
      track.unsafeAnchors.push(obj);
      obj.name = 'unsafeAnchors';
      window.postMessage({
        type: "FROM_HOOKISH",
        'obj': obj
      }, "*");
    }

    track.ws.add = function(obj) {
      track.ws.push(obj);
      console.log(obj.url + "  " + obj.data + " " + obj.type);
      obj.name = 'ws';
      obj.section = 'ws';
      window.postMessage({
        type: "FROM_HOOKISH",
        'obj': obj
      }, "*");
    }

    setHookishTagSettings = function(data){
      var settings = {};
      settings.tagged = false;
      settings.taintedClassName = '';
      // search the data for HOOKISH_TAGS from Taints.
      for(taintTag in Taints){
        if(data.includes(Taints[taintTag])){
          settings.tagged = true;
          settings.tagName = Taints[taintTag];
        }
      }
    return settings;
    }

  },


  /**
   * Hooking Element.prototype.innerHTML
   * This will take care of all Node.innerHTML.
   */

  dom_nodes: function(){
    console.log("Hooking DOM Noodes");
    var props = ['innerHTML', 'outerHTML'];

    props.forEach(function(prop){
      var setter = Element.prototype.__lookupSetter__(prop);
      Object.defineProperty(Element.prototype, prop, {
        set: function(){
          var hookishTagSettings = setHookishTagSettings(arguments[0]);
          if(hookishTagSettings.tagged === true){
            // Remove our tags if the actual sinks if present.
            hookishTagSettings.taintedClassName = 'taintedSink';
            arguments[0] = arguments[0].replace(new RegExp(hookishTagSettings.tagName, "gi"), '');
          }
          track.customHook.add(new Object({
            'type': 'sink',
            'data': arguments[0],
            'nodeName': this.nodeName,
            'propertyName': prop,
            'fullName': this.nodeName + '.' + prop,
            'meta': functionCallTracer(),
            'section': 'sinks',
            'hookishTagSettings': hookishTagSettings
          }), 'dom_nodes');
          return setter.apply(this, arguments);
        }
      });

    });
  },

  /**
   * Chrome >43 has disabled accessor, mutator for document.location :(
   * Need to wait and see. ES6 Proxy ?
   */

  document_location_hash: function() {
    var hash_setter = document.location.__lookupSetter__ ('hash');
    var hash_getter = document.location.__lookupGetter__ ('hash');
    Object.defineProperty(location, "hash", {
      get: function() {
        var h = hash_getter.apply(this, arguments);
        track.customHook.add(new Object({
          'type': 'source',
          'data': h,
          'section': 'sources',
          'meta': functionCallTracer()
        }), 'document_location_hash');
        return h;
      }
      /*
      ,
      set: function(val) {
        track.customHook.add(new Object({
          'type': 'sink',
          'data': val,
          'section': 'sinks',
          'meta': functionCallTracer()
        }), 'document_location_hash');
        return hash_getter.apply(this, arguments);
      }*/

    });
  },

  document_referrer: function() {
    var original_document_referrer = document.referrer;
    Object.defineProperty(document, "referrer", {
      get: function() {
        track.customHook.add(new Object({
          'type': 'source',
          'data': original_document_referrer,
          'section': 'sources',
          'meta': functionCallTracer()
        }), 'document_referrer');
        return original_document_referrer;
      }
    });
  },
  // window.name doesn't have the native __getter__
  window_name: function() {
    var global = {};
    global.current_window_name = window.name;
    Object.defineProperty(window, "name", {
      get: function() {
        current_window_name = global.current_window_name;
        track.customHook.add(new Object({
          'type': 'source',
          'data': current_window_name,
          'section': 'sources',
          'meta': functionCallTracer()
        }), 'window_name');
        return current_window_name;
      },

      set: function(val) {
        val = val.toString();
        global.current_window_name = val;
        track.customHook.add(new Object({
          'type': 'sink',
          'data': val,
          'section': 'sinks',
          'meta': functionCallTracer()
        }), 'window_name');
      }

    });
  },


  document_cookie: function() {
    var cookie_setter = document.__lookupSetter__ ('cookie');
    var cookie_getter = document.__lookupGetter__ ('cookie');
    Object.defineProperty(document, "cookie", {
      get: function() {
          var c = cookie_getter.apply(this, arguments);
          track.customHook.add(new Object({
            'type': 'source',
            'data': c,
            'section': 'sources',
            'meta': functionCallTracer()
          }), 'document_cookie');
          return c;
        },
      set: function(val) {
        track.customHook.add(new Object({
          'type': 'sink',
          'data': val,
          'section': 'sinks',
          'meta': functionCallTracer()
        }), 'document_cookie');
        return cookie_getter.apply(this, arguments);
      }

    });
  },

  window_eval: function() {
    var original_window_eval = window.eval;
    window.eval = function() {
      track.customHook.add(new Object({
        'type': 'sink',
        'data': arguments[0],
        'section': 'sinks',
        'meta': functionCallTracer()
      }), 'window_eval');
      return original_window_eval.apply(this, arguments);
    }
  },
  document_write: function() {
    var original_document_write = document.write;
    document.write = function() {
      track.customHook.add(new Object({
        'type': 'sink',
        'data': arguments[0],
        'section': 'sinks',
        'meta': functionCallTracer()
      }), 'document_write');
      return original_document_write.apply(this, arguments);
    }
  },
  window_setTimeout: function() {
    var original_window_setTimeout = window.setTimeout;
    window.setTimeout = function() {
      track.customHook.add(new Object({
        'type': 'sink',
        'section': 'sinks',
        'data': arguments[0].toString(),
        'meta': functionCallTracer()
      }), 'window_setTimeout');
      return original_window_setTimeout.apply(this, arguments)
    }
  },
  window_setInterval: function() {
    var original_window_setInterval = window.setInterval;
    window.setInterval = function() {
      track.customHook.add(new Object({
        'type': 'sink',
        'section': 'sinks',
        'data': arguments[0].toString(),
        'meta': functionCallTracer()
      }), 'window_setInterval');
      return original_window_setInterval.apply(this, arguments)
    }
  },

  xhr: function() {
    xhook.enable();
    xhook.after(function(req, res) {
      console.log(req);
      console.log(res);
      // Lets tamper with the response
      resBody = res.text.toString().trim();
      if (resBody[0] === '{' && resBody[resBody.length - 1] === '}') {
        resBody = JSON.parse(resBody);
        Object.keys(resBody).forEach(function(key) {
           // Tainting all the values of a JSON XHR Response.
          resBody[key] = resBody[key] + Taints.XHR_JSON_RESPONSE;
        })
        resBody = JSON.stringify(resBody);
        res.text = resBody.toString();
        console.log("Modified response: " + res.text)
      }
      track.xhr.add({ // need to add more OBJECTs!!
        method: req.method,
        url: req.url,
        reqBody: req.body
      });
    })
  },

  ws: function() {
    wsHook.onMessage = function(event) {
      console.log("ws recieved: " + event);
      track.ws.add({
        data: event.data,
        url: event.url,
        type: 'response' // onMessage from the server
      });
    }

    wsHook.onSend = function(event) {
      console.log("ws sent: " + event);
      track.ws.add({
        data: event.data,
        url: event.url,
        type: 'request' // onSend to the server
      });
    }
  },

  dom_text_node_mutation: function() {
    console.log('Enabling dom_text_node_mutation Mutation Observer. Things can become a little slow!');
    var mutationConfig = {
      characterData: true,
      subtree: true
    };
    var domTextNodeObserver = new MutationObserver(handleMutation);
    domTextNodeObserver.observe(document, mutationConfig);

    function handleMutation(mutations) {
      console.log("FROM !!! ! HOOKISH MUTATION OBSERVER");
      console.warn(mutations);

      mutations.forEach(function(mutation) {
        if (mutation.type === 'characterData') { // Only observing textNode like changes for now.
          var mutatedTargetValue = mutation.target.nodeValue;
          track.customHook.add(new Object({
            'type': 'sink',
            'data': mutatedTargetValue,
            meta: '',
            'section': 'sinks'
          }), 'dom_text_node_mutation')
        };
      });
    }
  },

  unsafeAnchors: function() {
    // https://hackerone.com/reports/23386
    var hookUnsafeAnchors = function() {
      console.log('Hooking into all Anchor tags to analyze them for unsafe usage of target="_blank"');
      var anchors = document.getElementsByTagName('a');
      // Convert HTMLCollection to Array
      anchors = [].slice.call(anchors);
      anchors.forEach(function(anchor) {
        if ('target' in anchor && anchor.target == '_blank') {
          var anchorCopy = anchor.cloneNode();
          var tmpNode = document.createElement("div");
          tmpNode.appendChild(anchorCopy);
          track.unsafeAnchors.add({
            href: anchor.href,
            target: anchor.target,
            hostname: anchor.hostname,
            string: tmpNode.innerHTML.toString()
          });
          delete tmpNode;
        }
      })
      console.log(anchors);
    }
    window.addEventListener("load", hookUnsafeAnchors, false);
  }

}