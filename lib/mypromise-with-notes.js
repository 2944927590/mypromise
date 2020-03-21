// 定义三种状态的常量
const PENDING = 'pending';
const FULFILLED = 'fulfilled';
const REJECTED = 'rejected';

// pomise 接收一个 executor 执行器，执行器立刻执行
function MyPromise(executor) {
  const _this = this;
  // promise 当前的状态
  _this.currentState = PENDING;
  _this.value = undefined;

  // 保存 then 中的回调，只有当 promise 状态为 pending 时才会缓存，并且每个实例至多缓存一个
  _this.onFulfilledCallbacks = [];
  _this.onRejectedCallbacks = [];


  function resolve(value) {
    if (value instanceof MyPromise) {
      // 如果 value 是个 Promise，调用 then 方法继续执行
      value.then(resolve, reject);
    }

    // 异步执行，保证执行顺序
    setTimeout(() => {
      if (_this.currentState === PENDING) {
        _this.currentState = FULFILLED;
        _this.value = value;
        _this.onFulfilledCallbacks.forEach(fn => fn());
      }
    });
  }

  function reject(reason) {
    // 异步执行，保证执行顺序
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
  // 2.2.1 onFulfilled 和 onRejected 都是可选参数
  // 2.2.5 onFulfilled 和 onRejected 必须作为函数被调用
  // 2.2.7.3 如果 onFulfilled 不是一个函数，promise2 以promise1的值fulfilled
  // 2.2.7.4 如果 onRejected 不是一个函数，promise2 以promise1的reason rejected
  onFulfilled = typeof onFulfilled === 'function' ? onFulfilled : valve => valve;
  onRejected = typeof onRejected === 'function' ? onRejected : reason => { throw reason };

  // 2.2.7，then 必须返回一个新的 promise
  const promise2 = new MyPromise((resolve, reject) => {
    if (_this.currentState === FULFILLED) {
      // 2.2.4 保证 onFulfilled，onRjected 异步执行
      setTimeout(() => {
        try {
          // 2.2.7.1 onFulfilled 或 onRejected 执行的结果为 x, 调用 resolutionProcedure
          const x = onFulfilled(_this.value);
          resolutionProcedure(promise2, x, resolve, reject);
        } catch(err) {
          // 2.2.7.2 如果 onFulfilled 或者 onRejected 执行时抛出异常 err, promise2 需要被 reject
          reject(err);
        }
      });
    }
    
    if (_this.currentState === REJECTED) {
      setTimeout(() => {
        try {
          // 2.2.7.1 onFulfilled 或 onRejected 执行的结果为 x, 调用 resolutionProcedure
          const x = onRejected(_this.value);
          resolutionProcedure(promise2, x, resolve, reject);
        } catch(err) {
          // 2.2.7.2 如果 onFulfilled 或者 onRejected 执行时抛出异常 err, promise2 需要被 reject
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

// 2.3 resolutionProcedure(promise2, x, resolve, reject)
function resolutionProcedure(promise2, x, resolve, reject) {

  // 2.3.1 如果 promise2 和 x 相等，那么 reject promise with a TypeError
  if (promise2 === x) {
    reject(new TypeError('Error'));
  }

  // 2.3.2 如果 x 为 Promise，状态为 pending 需要继续等待否则执行
  if (x instanceof MyPromise) {
    if (x.currentState === PENDING) {
      x.then(value => {
        resolutionProcedure(promise2, value, resolve, reject);
      }, reject)
    } else {
      x.then(resolve, reject);
    }
  }

  // 2.3.3.3.3 reject 或者 resolve 其中一个执行过的话，忽略其他的
  let called = false;

  // 2.3.3，判断 x 是否为对象或者函数
  if ( x && (typeof x === 'object' || typeof x === 'function') ) {
    try {
      let then = x.then;
      // 2.3.3.3 如果 then 是一个函数，then.call(x, resolvePromiseFn, rejectPromiseFn)
      if (typeof then === 'function') {
        then.call(
          x,
          y => {
            if (called) return;
            called = true;
            // 2.3.3.3.1 resolvePromiseFn 的 入参是 y, 执行 resolutionProcedure(promise2, y, resolve, reject);
            resolutionProcedure(promise2, y, resolve, reject);
          },
          r => {
            if (called) return;
            called = true;
            // 2.3.3.3.2 rejectPromise 的 入参是 r, reject promise with r.
            reject(r);
          }
        );
      } else {
        // 2.3.3.4 如果 then 不是一个 function. fulfill promise with x.
        resolve(x);
      }
    } catch(err) {
      // 2.3.3.2 如果 x.then 这步出错，那么 reject promise with err as the reason
      if (called) return;
      called = true;
      reject(err)
    }

  } else {
    // 2.3.4 如果 x 不是一个 object 或者 function，fulfill promise with x.
    resolve(x);
  }
}

module.exports = MyPromise;

