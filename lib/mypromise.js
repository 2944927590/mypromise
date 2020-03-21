const PENDING = 'pending';
const FULFILLED = 'fulfilled';
const REJECTED = 'rejected';

function MyPromise(executor) {
  const _this = this;

  _this.currentState = PENDING;
  _this.value = undefined;
  
  _this.onFulfilledCallbacks = [];
  _this.onRejectedCallbacks = [];


  function resolve(value) {
    if (value instanceof MyPromise) {
      value.then(resolve, reject);
    }

    setTimeout(() => {
      if (_this.currentState === PENDING) {
        _this.currentState = FULFILLED;
        _this.value = value;
        _this.onFulfilledCallbacks.forEach(fn => fn());
      }
    });
  }

  function reject(reason) {
    setTimeout(() => {
      if (_this.currentState === PENDING) {
        _this.currentState = REJECTED;
        _this.value = reason;
        _this.onRejectedCallbacks.forEach(fn => fn());
      }
    });
  }

  try {
    executor(resolve, reject);
  } catch(err) {
    reject(err);
  }
}

MyPromise.prototype.constructor = MyPromise;

MyPromise.prototype.then = function (onFulfilled, onRejected) {
  const _this = this;

  onFulfilled = typeof onFulfilled === 'function' ? onFulfilled : valve => valve;
  onRejected = typeof onRejected === 'function' ? onRejected : reason => { throw reason };

  const promise2 = new MyPromise((resolve, reject) => {
    if (_this.currentState === FULFILLED) {
      setTimeout(() => {
        try {
          const x = onFulfilled(_this.value);
          resolutionProcedure(promise2, x, resolve, reject);
        } catch(err) {
          reject(err);
        }
      });
    }
    
    if (_this.currentState === REJECTED) {
      setTimeout(() => {
        try {
          const x = onRejected(_this.value);
          resolutionProcedure(promise2, x, resolve, reject);
        } catch(err) {
          reject(err);
        }
      });
    }
    
    if (_this.currentState === PENDING) {
      _this.onFulfilledCallbacks.push(() => {
        setTimeout(() => {
          try {
            const x = onFulfilled(_this.value);
            resolutionProcedure(promise2, x, resolve, reject);
          } catch(err) {
            reject(err);
          }
        });
      });

      _this.onRejectedCallbacks.push(() => {
        setTimeout(() => {
          try {
            const x = onRejected(_this.value);
            resolutionProcedure(promise2, x, resolve, reject);
          } catch(err) {
            reject(err);
          }
        });
      });
    }
  });

  return promise2;
}


function resolutionProcedure(promise2, x, resolve, reject) {
  if (promise2 === x) {
    reject(new TypeError('Error'));
  }

  if (x instanceof MyPromise) {
    if (x.currentState === PENDING) {
      x.then(value => {
        resolutionProcedure(promise2, value, resolve, reject);
      }, reject)
    } else {
      x.then(resolve, reject);
    }
  }
  
  let called = false;

  if ( x && (typeof x === 'object' || typeof x === 'function') ) {
    try {
      let then = x.then;
      if (typeof then === 'function') {
        then.call(
          x,
          y => {
            if (called) return;
            called = true;
            resolutionProcedure(promise2, y, resolve, reject);
          },
          r => {
            if (called) return;
            called = true;
            reject(r);
          }
        );
      } else {
        resolve(x);
      }
    } catch(err) {
      if (called) return;
      called = true;
      reject(err)
    }

  } else {
    resolve(x);
  }
}

module.exports = MyPromise;

