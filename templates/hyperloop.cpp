/*
 * Java specific hyperloop
 */

#include <jni.h>
#include <iostream>

static JavaVM *_vm  = nullptr;

/* try-catch Java Exception and convert it to JS exception */
bool Hyperloop::JNIEnv::CheckJavaException(JSContextRef ctx, JSValueRef *exception)
{
    if (env->ExceptionCheck()) {
        jthrowable th = env->ExceptionOccurred();
        // Because you must not call most JNI functions while an exception is pending,
        // clear it after getting detailed class.
        env->ExceptionClear();
        jclass thClass = env->GetObjectClass(th);
        jmethodID methodId = env->GetMethodID(thClass, "toString", "()Ljava/lang/String;");
        jstring jmsg = (jstring)env->CallObjectMethod(th, methodId);
        if (jmsg != nullptr) {
            const char* msg = env->GetStringUTFChars(jmsg, NULL);
            *exception = HyperloopMakeException(ctx, msg);
        
            env->ReleaseStringUTFChars(jmsg, msg);
            env->DeleteLocalRef(jmsg);
        }
        env->DeleteLocalRef(th);
        env->DeleteLocalRef(thClass);
        
        return true;
    }
    return false;
}
EXPORTAPI jint JNI_OnLoad(JavaVM* vm, void* reserved)
{
	_vm = vm;
	return JNI_VERSION_1_6;
}

EXPORTAPI JavaVM* HLGetJavaVM()
{
	return _vm;
}

/*
 * Mac OS X ... jint AttachCurrentThread(void **penv, void *args);
 * Android  ... jint AttachCurrentThread(JNIEnv** p_env, void* thr_args);
 */
Hyperloop::JNIEnv::JNIEnv() : jvm{HLGetJavaVM()}, env{nullptr}, attached(false)
{
	auto envp = reinterpret_cast<void**>(&env);
	jint jvm_attach_status = jvm->GetEnv(envp, JNI_VERSION_1_6);
	if (jvm_attach_status == JNI_EDETACHED) 
	{
#ifdef __ANDROID__
		jvm_attach_status = jvm->AttachCurrentThread(&env, nullptr);
#else
        jvm_attach_status = jvm->AttachCurrentThread(envp, nullptr);
#endif
		if (jvm_attach_status == JNI_OK)
		{
			attached = true;
		}
	}
}

Hyperloop::JNIEnv::~JNIEnv() 
{
	if (attached) 
	{
		jvm->DetachCurrentThread();
	}
}

/**
 * native implementation of the logger
 */
EXPORTAPI void HyperloopNativeLogger(const char *str)
{
#ifdef __ANDROID__
    LOGI("%s", str)
#else
    std::cout << str << std::endl;
#endif
}

/**
 * std::to_string alternative as Android NDK doesn't have it
 */
template <typename T>
std::string to_string(T value)
{
    std::ostringstream os ;
    os << value ;
    return os.str() ;
}

///////////////////////////////////////////////////////////////////////////////
// Java object specialization
///////////////////////////////////////////////////////////////////////////////

#ifdef __ANDROID__
#define JAVA_LANG_BOOLEAN_SIG "java/lang/Boolean"
#define JAVA_LANG_DOUBLE_SIG "java/lang/Double"
#define JAVA_SIG_S ""
#define JAVA_SIG_E ""
#else
#define JAVA_LANG_BOOLEAN_SIG "Ljava/lang/Boolean;"
#define JAVA_LANG_DOUBLE_SIG "Ljava/lang/Double;"
#define JAVA_SIG_S "L"
#define JAVA_SIG_E ";"
#endif

namespace Hyperloop
{
typedef Hyperloop::NativeObject<jobject *> * NativeObjectJava;
    
static NativeObjectJava ToNativeObjectJava(void* p) {
    return reinterpret_cast<NativeObjectJava>(p);
}

template<>
void Hyperloop::NativeObject<jobject>::release()
{
    Hyperloop::JNIEnv env;
    env->DeleteGlobalRef(this->object);
}

template<>
void Hyperloop::NativeObject<jobject>::retain()
{
    Hyperloop::JNIEnv env;
    this->object = env->NewGlobalRef(this->object);
}

template<>
bool Hyperloop::NativeObject<jobject>::hasInstance(JSContextRef ctx, JSValueRef other, JSValueRef* exception)
{
    Hyperloop::JNIEnv env;
    auto p = JSObjectGetPrivate(JSValueToObject(ctx,other,0));
    if (p!=nullptr) {
        jclass clazz = env->GetObjectClass(this->object);
        jobject objectB = *ToNativeObjectJava(p)->getObject();
        jboolean isInstance = env->IsInstanceOf(objectB, clazz);
        env->DeleteLocalRef(clazz);
        if (env.CheckJavaException(ctx, exception)) {
            return false;
        }
        return isInstance == JNI_TRUE ? true : false;
    }
    return false;
}

template<>
std::string Hyperloop::NativeObject<jobject>::toString(JSContextRef ctx, JSValueRef* exception)
{
    Hyperloop::JNIEnv env;
    jclass cls = env->GetObjectClass(this->object);
    jmethodID mid = env->GetMethodID(cls, "toString", "()Ljava/lang/String;");
    jstring strObj = static_cast<jstring>(env->CallObjectMethod(this->object, mid));
    if (env.CheckJavaException(ctx, exception) || strObj == nullptr) {
        return "";
    }
    const char* str = env->GetStringUTFChars(strObj, NULL);
    return std::string(str);
}

template<>
double Hyperloop::NativeObject<jobject>::toNumber(JSContextRef ctx, JSValueRef* exception)
{
    Hyperloop::JNIEnv env;
    jclass cls = env->GetObjectClass(this->object);
    jmethodID mid = env->GetMethodID(cls, "toString", "()Ljava/lang/String;");
    jstring strObj = static_cast<jstring>(env->CallObjectMethod(this->object, mid));
    if (env.CheckJavaException(ctx, exception) || strObj == nullptr) {
        return NAN;
    }
    jclass converterClass = env->FindClass(JAVA_LANG_DOUBLE_SIG);
    if (converterClass == nullptr) {
        *exception = HyperloopMakeException(ctx, "Class not found: java.lang.Double");
        return NAN;
    }
    jmethodID convertMethodId = env->GetStaticMethodID(converterClass, "parseDouble", "(Ljava/lang/String;)D");
    if (convertMethodId == nullptr) {
        *exception = HyperloopMakeException(ctx, "Method not found: java.lang.Double#parseDouble");
        return NAN;
    }
    double result = env->CallStaticDoubleMethod(converterClass, convertMethodId, strObj);
    env->DeleteLocalRef(converterClass);
    env->DeleteLocalRef(strObj);
    if (env.CheckJavaException(ctx, exception)) {
        return NAN;
    }
    return result;
}

template<>
bool Hyperloop::NativeObject<jobject>::toBoolean(JSContextRef ctx, JSValueRef* exception)
{
    Hyperloop::JNIEnv env;
    jclass cls = env->GetObjectClass(this->object);
    jmethodID mid = env->GetMethodID(cls, "toString", "()Ljava/lang/String;");
    jstring strObj = static_cast<jstring>(env->CallObjectMethod(this->object, mid));
    if (env.CheckJavaException(ctx, exception) || strObj == nullptr) {
        return false;
    }
    jclass converterClass = env->FindClass(JAVA_LANG_BOOLEAN_SIG);
    if (converterClass == nullptr) {
        *exception = HyperloopMakeException(ctx, "Class not found: java.lang.Boolean");
        return false;
    }
    jmethodID convertMethodId = env->GetStaticMethodID(converterClass, "parseBoolean", "(Ljava/lang/String;)Z");
    if (convertMethodId == nullptr) {
        *exception = HyperloopMakeException(ctx, "Method not found: java.lang.Boolean#parseBoolean");
        return false;
    }
    jboolean result = env->CallStaticBooleanMethod(converterClass, convertMethodId, strObj);
    env->DeleteLocalRef(converterClass);
    env->DeleteLocalRef(strObj);
    if (env.CheckJavaException(ctx, exception)) {
        return false;
    }
    return result == JNI_TRUE ? true : false;
}

/**
 * returns true if b is an instanceof a class
 */
bool Hyperloop::JNIEnv::IsInstanceOf(JSContextRef ctx, const char * classname, JSValueRef other, JSValueRef *exception)
{
    auto o = JSValueToObject(ctx,other,0);
    if (o!=nullptr) 
    {
        auto p = JSObjectGetPrivate(o);
        if (p != nullptr) 
        {
            Hyperloop::JNIEnv env;
            jclass javaClass = env->FindClass(classname);
            jobject objectB = *ToNativeObjectJava(p)->getObject();
            jboolean isInstance = env->IsInstanceOf(objectB, javaClass);
            env->DeleteLocalRef(javaClass);
            if (CheckJavaException(ctx, exception)) 
            {
                return false;
            }
            return isInstance == JNI_TRUE ? true : false;
        }

        #define STR(x) #x
        #define IS_JS_TYPE(cls,type) \
        if (std::string(classname)==std::string(JAVA_SIG_S "java/lang/" STR(cls) JAVA_SIG_E) && JSValueIs ## type(ctx,other))\
        {\
            return true;\
        }\

        IS_JS_TYPE(String,String)
        IS_JS_TYPE(Boolean,Boolean)
        IS_JS_TYPE(Number,Number)
        IS_JS_TYPE(Double,Number)
        IS_JS_TYPE(Long,Number)
        IS_JS_TYPE(Short,Number)
        IS_JS_TYPE(Integer,Number)
        IS_JS_TYPE(Float,Number)
    }
    return false;
}

} // namespace

/**
 * return a JS string from a jchar *
 */
EXPORTAPI JSValueRef HyperloopMakeStringFromJChar(JSContextRef ctx, jchar *jchars, jsize length, JSValueRef *exception)
{
    Hyperloop::JNIEnv env;
    auto string = env->NewString(jchars, length);
    auto cchars = env->GetStringUTFChars(string, JNI_FALSE);
    auto stringRef = JSStringCreateWithUTF8CString(cchars);
    auto result = JSValueMakeString(ctx,stringRef);
    JSStringRelease(stringRef);
    env->ReleaseStringUTFChars(string, cchars);
    env->DeleteLocalRef(string);
    return result;
}

/**
 * called to convert an Java array to a JSValueRef
 */
EXPORTAPI JSValueRef java_lang_Object_ToJSValue(JSContextRef,jobject,JSValueRef *);
EXPORTAPI JSValueRef JavaCharArray_ToJSValue(JSContextRef ctx, jobject instance, JSValueRef *exception)
{
    Hyperloop::JNIEnv env;
    auto array = static_cast<jcharArray>(instance);
    auto length = env->GetArrayLength(array);
    auto jchars = env->GetCharArrayElements(array, JNI_FALSE);
    auto str = HyperloopMakeStringFromJChar(ctx, jchars, length, exception);
    env->ReleaseCharArrayElements(array, jchars, JNI_FALSE);

    // split into char array (by JS)
    auto strObj = JSValueToObject(ctx, str, exception);

    auto funcStr = JSStringCreateWithUTF8CString("split");
    auto func = JSValueToObject(ctx, JSObjectGetProperty(ctx, strObj, funcStr, exception), exception);
    JSStringRelease(funcStr);

    auto arg0Str = JSStringCreateWithUTF8CString("");
    auto arg0 = JSValueMakeString(ctx, arg0Str);
    JSStringRelease(arg0Str);

    return JSObjectCallAsFunction(ctx, func, strObj, 1, &arg0, exception);
}
#define JavaPrimitiveArray_ToJSValue(type,cap)\
EXPORTAPI JSValueRef Java##cap##Array_ToJSValue(JSContextRef ctx, j##type##Array instance, JSValueRef *exception)\
{\
    Hyperloop::JNIEnv env;\
    auto array = static_cast<j##type##Array>(instance);\
    auto length = env->GetArrayLength(array);\
    auto values = static_cast<JSValueRef*>(malloc(sizeof(JSValueRef) * length));\
    auto objects = env->Get##cap##ArrayElements(array, 0);\
    for (auto i = 0; i < length; i++) {\
        values[i] = JSValueMakeNumber(ctx, static_cast<double>(objects[i]));\
    }\
    env->Release##cap##ArrayElements(array, objects, 0);\
    auto result = JSObjectMakeArray(ctx, length, values, exception);\
    free(values);\
    return result;\
}

JavaPrimitiveArray_ToJSValue(boolean,Boolean)
JavaPrimitiveArray_ToJSValue(byte,Byte)
JavaPrimitiveArray_ToJSValue(short,Short)
JavaPrimitiveArray_ToJSValue(int,Int)
JavaPrimitiveArray_ToJSValue(long,Long)
JavaPrimitiveArray_ToJSValue(float,Float)
JavaPrimitiveArray_ToJSValue(double,Double)

EXPORTAPI jbooleanArray JSValueTo_JavaBooleanArray(JSContextRef ctx, JSValueRef value, JSValueRef *exception)
{
    Hyperloop::JNIEnv env;
    auto arrayObj = JSValueToObject(ctx, value, exception);
    auto lengthStr = JSStringCreateWithUTF8CString("length");
    auto length = JSValueToNumber(ctx, JSObjectGetProperty(ctx, arrayObj, lengthStr, exception), exception);
    JSStringRelease(lengthStr);
    if (!JSValueIsNull(ctx, *exception))
    {
        return NULL;
    }
    auto array = env->NewBooleanArray(length);
    auto elements = env->GetBooleanArrayElements(array, JNI_FALSE);
    for (auto i = 0; i < length; i++) {
        auto elm = JSObjectGetPropertyAtIndex(ctx, arrayObj, i, exception);
        elements[i] = JSValueToBoolean(ctx, elm);
    }
    env->ReleaseBooleanArrayElements(array,elements,0);
    return array;
}

#define JSValueTo_JavaPrimitiveArray(type,ctype,cap)\
EXPORTAPI j##type##Array JSValueTo_Java##cap##Array(JSContextRef ctx, JSValueRef value, JSValueRef *exception)\
{\
    Hyperloop::JNIEnv env;\
    auto arrayObj = JSValueToObject(ctx, value, exception);\
    auto lengthStr = JSStringCreateWithUTF8CString("length");\
    auto length = JSValueToNumber(ctx, JSObjectGetProperty(ctx, arrayObj, lengthStr, exception), exception);\
    JSStringRelease(lengthStr);\
    if (!JSValueIsNull(ctx, *exception))\
    {\
        return NULL;\
    }\
    auto array = env->New##cap##Array(length);\
    auto elements = env->Get##cap##ArrayElements(array, JNI_FALSE);\
    for (auto i = 0; i < length; i++) {\
        auto elm = JSObjectGetPropertyAtIndex(ctx, arrayObj, i, exception);\
        elements[i] = (ctype)JSValueToNumber(ctx, elm, exception);\
    }\
    env->Release##cap##ArrayElements(array,elements,0);\
    return array;\
}

JSValueTo_JavaPrimitiveArray(byte,short,Byte)
JSValueTo_JavaPrimitiveArray(short,short,Short)
JSValueTo_JavaPrimitiveArray(int,int,Int)
JSValueTo_JavaPrimitiveArray(long,long,Long)
JSValueTo_JavaPrimitiveArray(float,float,Float)
JSValueTo_JavaPrimitiveArray(double,double,Double)

EXPORTAPI jcharArray JSValueTo_JavaCharArray(JSContextRef ctx, JSValueRef array, JSValueRef *exception) {
    Hyperloop::JNIEnv env;

    // join char array into string (by JS)
    auto arrayObj = JSValueToObject(ctx, array, exception);

    auto funcStr = JSStringCreateWithUTF8CString("join");
    auto func = JSValueToObject(ctx, JSObjectGetProperty(ctx, arrayObj, funcStr, exception), exception);
    JSStringRelease(funcStr);

    auto arg0Str = JSStringCreateWithUTF8CString("");
    auto arg0 = JSValueMakeString(ctx, arg0Str);
    JSStringRelease(arg0Str);

    JSValueRef value = JSObjectCallAsFunction(ctx, func, arrayObj, 1, &arg0, exception);

    if (!JSValueIsNull(ctx, *exception))
    {
        return NULL;
    }

    if (JSValueIsString(ctx, value)) {
        // get string from JS obj, split into jcharArray
        auto str_from = HyperloopJSValueToStringCopy(ctx,value,exception);
        auto jstr_from = env->NewStringUTF(str_from);
        delete [] str_from;

        auto jchars_from = env->GetStringChars(jstr_from, JNI_FALSE);
        auto jchars_len  = env->GetStringLength(jstr_from);
        auto jchars_to   = env->NewCharArray(jchars_len);
        auto to_elms = env->GetCharArrayElements(jchars_to, NULL);

        for (auto i = 0; i < jchars_len; i++) {
            to_elms[i] = jchars_from[i];
        }

        env->ReleaseStringChars(jstr_from, jchars_from);
        env->ReleaseCharArrayElements(jchars_to, to_elms, 0);

        return jchars_to;
    }

    return nullptr;
}

EXPORTAPI JSValueRef JavaObjectArray_ToJSValue(JSContextRef ctx, jobject instance, JSValueRef *exception)
{
    Hyperloop::JNIEnv env;
    auto array = static_cast<jobjectArray>(instance);
    auto length = env->GetArrayLength(array);

    auto values = static_cast<JSValueRef*>(malloc(sizeof(JSValueRef) * length));

    for (auto i = 0; i < length; i++) {
        auto object = env->GetObjectArrayElement(array, i);
        values[i] = java_lang_Object_ToJSValue(ctx, object, exception);
        env->DeleteLocalRef(object);
    }

    auto result = JSObjectMakeArray(ctx, length, values, exception);
    free(values);

    return result;
}

EXPORTAPI jobject java_lang_Boolean_constructor__Z_V(JSContextRef ctx, const JSValueRef arguments[], JSValueRef* exception);
EXPORTAPI jobject java_lang_Double_constructor__D_V(JSContextRef ctx, const JSValueRef arguments[], JSValueRef* exception);

EXPORTAPI jobject JSValueTo_JavaObject(JSContextRef ctx, JSValueRef value, JSValueRef *exception)
{
    auto object = JSValueToObject(ctx,value,exception);
    if (object==nullptr)
    {
        *exception = HyperloopMakeException(ctx,"couldn't convert object to Java Object");
        return nullptr;
    }
    auto p = JSObjectGetPrivate(object);
    if (p!=nullptr)
    {
        auto jobj = reinterpret_cast<Hyperloop::NativeObject<jobject> *>(p);
        return jobj->getObject();
    }
    // handle JS types and converting to native Java objects
    if (JSValueIsString(ctx,value)) 
    {
        Hyperloop::JNIEnv env;
        auto str = HyperloopJSValueToStringCopy(ctx,value,exception);
        auto jstr = env->NewStringUTF(str);
        delete [] str;
        return jstr;
    }
    if (JSValueIsBoolean(ctx,value))
    {
        JSValueRef args[] = {value};
        return java_lang_Boolean_constructor__Z_V(ctx,args,exception);
    }
    if (JSValueIsNumber(ctx,value))
    {
        JSValueRef args[] = {value};
        return java_lang_Double_constructor__D_V(ctx,args,exception);
    }
    return nullptr;
}

///////////////////////////////////////////////////////////////////////////////////////////////
EXPORTAPI JSValueRef HyperloopAppRequire(JSValueRef *exception);

EXPORTAPI void JNICALL Java_org_appcelerator_hyperloop_Hyperloop_loadApp
   (JNIEnv *env, jclass jcls)
{
#ifdef HL_ENABLE_GLOG
    google::InitGoogleLogging("Hyperloop_app");
    google::InstallFailureSignalHandler();
#endif
    LOGD("Java_app_loadApp")
    Hyperloop::JNIEnv e;
    JSValueRef exception = nullptr;
    HyperloopAppRequire(&exception);
    if (exception!=nullptr) {
        LOGD("Java_app_loadApp raised JS exception");
        JSStringRef str = JSValueToStringCopy(HyperloopGlobalContext(), exception, NULL);
        size_t len = JSStringGetMaximumUTF8CStringSize(str);
        char buf[len];
        JSStringGetUTF8CString(str, (char *)&buf, len);
        JSStringRelease(str);
#ifdef __ANDROID__
        LOGE("%s", buf);
#else
        LOGE(buf);
#endif
    }
    if (e.CheckJavaException(HyperloopGlobalContext(), &exception)) {
        LOGD("Java_app_loadApp raised Java exception");
    }
}
///////////////////////////////////////////////////////////////////////////////////////////////
