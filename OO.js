// This is an outdated pre-cursor to Objects.js
// The main focus here was an implementation of "message passing", where
// everything (objects, functions, arrays, etc.) would response to "messages".
// The language consists of a string of messages, such that "x y z" means
// "send messaage "x" to (global), then send "y" to the result, then send "z"
// to that result, etc. Parenthesis could be used to nest series of messages,
// such that "x (y z)" passes the result of "y z" to the result of "x".

(document.body||document.documentElement).innerHTML = "<html><head><title>Hello!</title></head><body style='margin:0;padding:0;background:#DDD;color:#BBB'><div style='position:absolute;left:22%;top:15%;font-family:Consolas;font-size:80px;font-weight:bold'>Hello World!</div></body></html>";

var global = {'native':window};

var sendMsg = function(o, context, msgs) {
   context = context || global
   if(typeof o === 'function') return o.apply(null, msgs);
   if(typeof o === 'array') return process(o, {'context':context}, msgs);
   if(typeof o === 'undefined' || o === null || o == undefined) return {};
   o = o[msgs[0]];
   if(typeof o === 'undefined' || o === null || o == undefined) return (context.context ? sendMsg(o, context.context, msgs) : {});
   return o;
};

var process = function(code, context, args) {
   context = context||{'context':global};
   args = args||[];
   var current = context;
   var results = [];
   var argsFound = false;
   for(var i=0; i<code.length; i++) {
      var msg = code[i];
      if(!argsFound) {
         if(msg === ':') argsFound = true;
         else context[msg] = args[i];
      }
      else if(msg == '(') current = process(code, context, args);
      else if (msg === ')') {
         results.push(current);
         return results;
      }
      else if (msg == ',') {
         results.push(current);
         current = context;
      }
      else current = sendMsg(current, context, [msg]);
   }
   results.push(current);
   return results;
};
