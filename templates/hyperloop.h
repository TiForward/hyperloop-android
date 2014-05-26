/**
 * Java specific implementation
 *
 * we specialize member functions to handle the base native object
 * for Java - which happens to be JNI objects like jobject.
 */
#ifndef __HYPERLOOPJAVA__HEADER__
#define __HYPERLOOPJAVA__HEADER__

#include <jni.h>
#include <iostream>

#ifdef HL_DEBUG
#ifdef __ANDROID__
#include <android/log.h>
#define HYPERLOOP_LOG_TAG "Hyperloop"
#define LOGD(...) ((void)__android_log_print(ANDROID_LOG_DEBUG, HYPERLOOP_LOG_TAG, __VA_ARGS__));
#define LOGI(...) ((void)__android_log_print(ANDROID_LOG_INFO,  HYPERLOOP_LOG_TAG, __VA_ARGS__));
#define LOGW(...) ((void)__android_log_print(ANDROID_LOG_WARN,  HYPERLOOP_LOG_TAG, __VA_ARGS__));
#define LOGE(...) ((void)__android_log_print(ANDROID_LOG_ERROR, HYPERLOOP_LOG_TAG, __VA_ARGS__));
#else
#ifdef HL_ENABLE_GLOG
#include <glog/logging.h>
#define LOGD(...) LOG(INFO) << __VA_ARGS__; // There's no DEBUG on glog
#define LOGI(...) LOG(INFO) << __VA_ARGS__;
#define LOGW(...) LOG(WARNING) << __VA_ARGS__;
#define LOGE(...) LOG(ERROR) << __VA_ARGS__;
#else
#define LOGD(...) std::cout << "[DEBUG] " << __VA_ARGS__ << std::endl;
#define LOGI(...) std::cout << "[INFO] " << __VA_ARGS__ << std::endl;
#define LOGW(...) std::cout << "[WARN] " << __VA_ARGS__ << std::endl;
#define LOGE(...) std::cout << "[ERROR] " << __VA_ARGS__ << std::endl;
#endif // HL_ENABLE_GLOG
#endif // __ANDROID__
#else
#define LOGD(...) // Disable logs
#define LOGI(...)
#define LOGW(...)
#define LOGE(...)
#endif // HL_DEBUG


///////////////////////////////////////////////////////////////////////////////
// Java JNI wrapper
///////////////////////////////////////////////////////////////////////////////

namespace Hyperloop
{
class JNIEnv
{
    public:
        JNIEnv();
        ~JNIEnv();
    
        bool CheckJavaException(JSContextRef ctx, JSValueRef *exception);
        bool IsInstanceOf(JSContextRef ctx, const char * classname, JSValueRef other, JSValueRef* exception);

        inline ::JNIEnv* operator->() { return env; }
    
    private:
        ::JavaVM *jvm;
        ::JNIEnv *env;
        bool attached;
};

} /* namespace */


EXPORTAPI jobject JSValueTo_JavaObject(JSContextRef ctx, JSValueRef value, JSValueRef *exception);

/* Java array support */
EXPORTAPI JSValueRef JavaBooleanArray_ToJSValue(JSContextRef ctx, jbooleanArray instance, JSValueRef *exception);
EXPORTAPI JSValueRef JavaByteArray_ToJSValue(JSContextRef ctx, jbyteArray instance, JSValueRef *exception);
EXPORTAPI JSValueRef JavaShortArray_ToJSValue(JSContextRef ctx, jshortArray instance, JSValueRef *exception);
EXPORTAPI JSValueRef JavaIntArray_ToJSValue(JSContextRef ctx, jintArray instance, JSValueRef *exception);
EXPORTAPI JSValueRef JavaLongArray_ToJSValue(JSContextRef ctx, jlongArray instance, JSValueRef *exception);
EXPORTAPI JSValueRef JavaFloatArray_ToJSValue(JSContextRef ctx, jfloatArray instance, JSValueRef *exception);
EXPORTAPI JSValueRef JavaDoubleArray_ToJSValue(JSContextRef ctx, jdoubleArray instance, JSValueRef *exception);
EXPORTAPI JSValueRef JavaObjectArray_ToJSValue(JSContextRef ctx, jobject instance, JSValueRef *exception);

EXPORTAPI jcharArray JSValueTo_JavaCharArray(JSContextRef ctx, JSValueRef value, JSValueRef *exception);
EXPORTAPI jbooleanArray JSValueTo_JavaBooleanArray(JSContextRef ctx, JSValueRef value, JSValueRef *exception);
EXPORTAPI jbyteArray JSValueTo_JavaByteArray(JSContextRef ctx, JSValueRef value, JSValueRef *exception);
EXPORTAPI jshortArray JSValueTo_JavaShortArray(JSContextRef ctx, JSValueRef value, JSValueRef *exception);
EXPORTAPI jintArray JSValueTo_JavaIntArray(JSContextRef ctx, JSValueRef value, JSValueRef *exception);
EXPORTAPI jlongArray JSValueTo_JavaLongArray(JSContextRef ctx, JSValueRef value, JSValueRef *exception);
EXPORTAPI jfloatArray JSValueTo_JavaFloatArray(JSContextRef ctx, JSValueRef value, JSValueRef *exception);
EXPORTAPI jdoubleArray JSValueTo_JavaDoubleArray(JSContextRef ctx, JSValueRef value, JSValueRef *exception);


/* Java char support */
EXPORTAPI JSValueRef HyperloopMakeStringFromJChar(JSContextRef ctx, jchar *jchars, jsize length, JSValueRef *exception);


#endif /* defined(__HYPERLOOPJAVA__HEADER__) */

