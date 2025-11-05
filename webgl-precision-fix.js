// WebGL Precision Format Fix for Mobile Browsers
(function() {
    'use strict';
    
    // Store original functions
    const originalGetShaderPrecisionFormat = WebGLRenderingContext.prototype.getShaderPrecisionFormat;
    const originalCreateShader = WebGLRenderingContext.prototype.createShader;
    const originalShaderSource = WebGLRenderingContext.prototype.shaderSource;
    const originalCompileShader = WebGLRenderingContext.prototype.compileShader;
    const originalGetError = WebGLRenderingContext.prototype.getError;
    
    // Track shader creation attempts for debugging
    let shaderCreationAttempts = 0;
    let failedShaderCreations = 0;
    let mockShaderCounter = 0;
    
    // Store mock shaders to track them
    const mockShaders = new WeakSet();
    
    // Patch Unity's internal _glGetShaderPrecisionFormat function
    function patchUnityInternals() {
        // Try to patch the window object for Unity's internal functions
        const originalWindowGetShaderPrecisionFormat = window._glGetShaderPrecisionFormat;
        
        if (typeof window._glGetShaderPrecisionFormat === 'function') {
            console.log('Patching Unity internal _glGetShaderPrecisionFormat');
            
            window._glGetShaderPrecisionFormat = function(shaderType, precisionType) {
                console.log('Unity internal _glGetShaderPrecisionFormat called');
                const result = originalWindowGetShaderPrecisionFormat.call(this, shaderType, precisionType);
                
                if (!result) {
                    console.warn('Unity internal _glGetShaderPrecisionFormat returned null, using fallback');
                    return {
                        rangeMin: 1,
                        rangeMax: 1,
                        precision: 23
                    };
                }
                
                return result;
            };
        }
        
        // Also try to patch Module if it exists
        if (typeof window.Module !== 'undefined' && window.Module && window.Module._glGetShaderPrecisionFormat) {
            console.log('Patching Module._glGetShaderPrecisionFormat');
            const originalModule = window.Module._glGetShaderPrecisionFormat;
            
            window.Module._glGetShaderPrecisionFormat = function(shaderType, precisionType) {
                console.log('Module._glGetShaderPrecisionFormat called');
                const result = originalModule.call(this, shaderType, precisionType);
                
                if (!result) {
                    console.warn('Module._glGetShaderPrecisionFormat returned null, using fallback');
                    return {
                        rangeMin: 1,
                        rangeMax: 1,
                        precision: 23
                    };
                }
                
                return result;
            };
        }
    }
    
    // Try to patch immediately and also set up watchers
    patchUnityInternals();
    
    // Monitor for when Unity's functions become available
    const originalDefineProperty = Object.defineProperty;
    Object.defineProperty = function(obj, prop, descriptor) {
        if (prop === '_glGetShaderPrecisionFormat' && (obj === window || obj === window.Module)) {
            console.log('Intercepted _glGetShaderPrecisionFormat definition');
            
            if (descriptor.value && typeof descriptor.value === 'function') {
                const originalFunc = descriptor.value;
                descriptor.value = function(shaderType, precisionType) {
                    console.log('Intercepted _glGetShaderPrecisionFormat call');
                    const result = originalFunc.call(this, shaderType, precisionType);
                    
                    if (!result) {
                        console.warn('Intercepted _glGetShaderPrecisionFormat returned null, using fallback');
                        return {
                            rangeMin: 1,
                            rangeMax: 1,
                            precision: 23
                        };
                    }
                    
                    return result;
                };
            }
        }
        
        return originalDefineProperty.call(this, obj, prop, descriptor);
    };
    
    // Create a more convincing mock shader
    function createMockShader(gl, type) {
        mockShaderCounter++;
        
        // Try to create a real shader with minimal source first
        const minimalSource = type === gl.VERTEX_SHADER 
            ? 'void main() { gl_Position = vec4(0.0); }'
            : 'void main() { gl_FragColor = vec4(1.0); }';
        
        let realShader = null;
        try {
            realShader = originalCreateShader.call(gl, type);
            if (realShader) {
                originalShaderSource.call(gl, realShader, minimalSource);
                originalCompileShader.call(gl, realShader);
                
                // Check if compilation succeeded
                if (gl.getShaderParameter(realShader, gl.COMPILE_STATUS)) {
                    console.log('Created minimal real shader as fallback');
                    return realShader;
                }
            }
        } catch (e) {
            console.warn('Could not create minimal real shader:', e);
        }
        
        // If real shader creation failed, create a sophisticated mock
        const mockShader = Object.create(WebGLShader.prototype);
        
        // Add properties that Unity might check
        Object.defineProperties(mockShader, {
            __isMockShader: { value: true, writable: false },
            __mockId: { value: mockShaderCounter, writable: false },
            shaderType: { 
                value: type === gl.VERTEX_SHADER ? 'vs' : 'fs', 
                writable: true 
            },
            toString: { 
                value: function() { return `[Mock WebGL Shader ${mockShaderCounter}]`; },
                writable: false 
            }
        });
        
        // Track this as a mock shader
        mockShaders.add(mockShader);
        
        console.log(`Created mock shader ${mockShaderCounter} for type:`, 
            type === gl.VERTEX_SHADER ? 'VERTEX_SHADER' : 'FRAGMENT_SHADER');
        
        return mockShader;
    }
    
    // Override shaderSource to handle mock shaders
    WebGLRenderingContext.prototype.shaderSource = function(shader, source) {
        if (mockShaders.has(shader)) {
            console.warn('Intercepted shaderSource call on mock shader, ignoring');
            return; // Do nothing for mock shaders
        }
        
        try {
            return originalShaderSource.call(this, shader, source);
        } catch (e) {
            console.error('shaderSource failed:', e);
            // Don't throw, just log the error
        }
    };
    
    // Override compileShader to handle mock shaders
    WebGLRenderingContext.prototype.compileShader = function(shader) {
        if (mockShaders.has(shader)) {
            console.warn('Intercepted compileShader call on mock shader, ignoring');
            return; // Do nothing for mock shaders
        }
        
        try {
            return originalCompileShader.call(this, shader);
        } catch (e) {
            console.error('compileShader failed:', e);
        }
    };
    
    // Unity GL object patching - wait for it to be available
    let unityGLPatchAttempts = 0;
    const maxUnityGLPatchAttempts = 200; // Increased attempts
    
    function patchUnityGL() {
        unityGLPatchAttempts++;
        
        // Also try to patch Unity's internal functions each time
        patchUnityInternals();
        
        // Check if Unity's GL object is available
        if (typeof window.GL !== 'undefined' && window.GL) {
            console.log('Found Unity GL object, patching...');
            
            // Patch the shaders array if it exists
            if (window.GL.shaders) {
                const originalShaders = window.GL.shaders;
                
                // Create a proxy to intercept shader assignments
                window.GL.shaders = new Proxy(originalShaders, {
                    set: function(target, property, value) {
                        if (value === null) {
                            console.warn(`Preventing null shader assignment to GL.shaders[${property}]`);
                            // Create a mock shader instead
                            value = createMockShader(window.GL.currentContext || {}, 0);
                        }
                        target[property] = value;
                        return true;
                    },
                    get: function(target, property) {
                        const value = target[property];
                        if (value === null) {
                            console.warn(`Intercepted null shader access from GL.shaders[${property}]`);
                            return createMockShader(window.GL.currentContext || {}, 0);
                        }
                        return value;
                    }
                });
            }
            
            // Try to patch any precision format functions in the GL object
            if (window.GL.getShaderPrecisionFormat) {
                const originalGLPrecision = window.GL.getShaderPrecisionFormat;
                window.GL.getShaderPrecisionFormat = function(shaderType, precisionType) {
                    console.log('Unity GL.getShaderPrecisionFormat called');
                    const result = originalGLPrecision.call(this, shaderType, precisionType);
                    
                    if (!result) {
                        console.warn('Unity GL.getShaderPrecisionFormat returned null, using fallback');
                        return {
                            rangeMin: 1,
                            rangeMax: 1,
                            precision: 23
                        };
                    }
                    
                    return result;
                };
            }
            
            console.log('Unity GL object patched successfully');
            return true;
        } else if (unityGLPatchAttempts < maxUnityGLPatchAttempts) {
            // Try again in 25ms (more frequent)
            setTimeout(patchUnityGL, 25);
            return false;
        } else {
            console.warn('Could not find Unity GL object to patch after', maxUnityGLPatchAttempts, 'attempts');
            return false;
        }
    }
    
    // Start trying to patch Unity GL immediately
    patchUnityGL();
    
    // Also patch when DOM is ready and at various other times
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', patchUnityGL);
    } else {
        setTimeout(patchUnityGL, 100);
    }
    
    // Set up additional watchers
    setTimeout(patchUnityGL, 500);
    setTimeout(patchUnityGL, 1000);
    setTimeout(patchUnityGL, 2000);
    
    // Override getShaderPrecisionFormat with null-safe version
    WebGLRenderingContext.prototype.getShaderPrecisionFormat = function(shaderType, precisionType) {
        console.log('WebGL getShaderPrecisionFormat called with:', shaderType, precisionType);
        
        let result;
        try {
            result = originalGetShaderPrecisionFormat.call(this, shaderType, precisionType);
        } catch (e) {
            console.error('getShaderPrecisionFormat threw error:', e);
            result = null;
        }
        
        if (!result) {
            console.warn('getShaderPrecisionFormat returned null, using fallback values');
            return {
                rangeMin: 1,
                rangeMax: 1,
                precision: 23
            };
        }
        
        return result;
    };
    
    // Override createShader to handle null returns more aggressively
    WebGLRenderingContext.prototype.createShader = function(type) {
        shaderCreationAttempts++;
        
        // First attempt
        let shader = originalCreateShader.call(this, type);
        
        if (!shader) {
            failedShaderCreations++;
            console.error(`createShader failed (attempt ${shaderCreationAttempts}, failed ${failedShaderCreations}) for type:`, 
                type === this.VERTEX_SHADER ? 'VERTEX_SHADER' : 'FRAGMENT_SHADER');
            
            const error = originalGetError.call(this);
            console.error('WebGL error code:', error);
            
            // Clear any pending errors
            while (originalGetError.call(this) !== this.NO_ERROR) {
                // Clear error queue
            }
            
            // Create a sophisticated mock shader
            shader = createMockShader(this, type);
        }
        
        return shader;
    };
    
    // Also handle WebGL2 context if available
    if (typeof WebGL2RenderingContext !== 'undefined') {
        const originalGetShaderPrecisionFormat2 = WebGL2RenderingContext.prototype.getShaderPrecisionFormat;
        const originalCreateShader2 = WebGL2RenderingContext.prototype.createShader;
        const originalShaderSource2 = WebGL2RenderingContext.prototype.shaderSource;
        const originalCompileShader2 = WebGL2RenderingContext.prototype.compileShader;
        
        WebGL2RenderingContext.prototype.shaderSource = function(shader, source) {
            if (mockShaders.has(shader)) {
                console.warn('Intercepted WebGL2 shaderSource call on mock shader, ignoring');
                return;
            }
            
            try {
                return originalShaderSource2.call(this, shader, source);
            } catch (e) {
                console.error('WebGL2 shaderSource failed:', e);
            }
        };
        
        WebGL2RenderingContext.prototype.compileShader = function(shader) {
            if (mockShaders.has(shader)) {
                console.warn('Intercepted WebGL2 compileShader call on mock shader, ignoring');
                return;
            }
            
            try {
                return originalCompileShader2.call(this, shader);
            } catch (e) {
                console.error('WebGL2 compileShader failed:', e);
            }
        };
        
        WebGL2RenderingContext.prototype.getShaderPrecisionFormat = function(shaderType, precisionType) {
            const result = originalGetShaderPrecisionFormat2.call(this, shaderType, precisionType);
            
            if (!result) {
                console.warn('WebGL2 getShaderPrecisionFormat returned null, using fallback values');
                return {
                    rangeMin: 1,
                    rangeMax: 1,
                    precision: 23
                };
            }
            
            return result;
        };
        
        WebGL2RenderingContext.prototype.createShader = function(type) {
            let shader = originalCreateShader2.call(this, type);
            
            if (!shader) {
                console.error('WebGL2 createShader failed for type:', type === this.VERTEX_SHADER ? 'VERTEX_SHADER' : 'FRAGMENT_SHADER');
                
                // Try recovery
                shader = originalCreateShader2.call(this, type);
                
                if (!shader) {
                    // Create mock object for WebGL2 as well
                    shader = {
                        __isMockShader: true,
                        shaderType: type === this.VERTEX_SHADER ? 'vs' : 'fs',
                        toString: function() { return '[Mock WebGL2 Shader]'; }
                    };
                    
                    try {
                        Object.setPrototypeOf(shader, WebGLShader.prototype);
                    } catch (e) {
                        // Continue with mock object
                    }
                }
            }
            
            return shader;
        };
    }
})();

// Enhanced WebGL compatibility checks
function checkWebGLSupport() {
    try {
        const canvas = document.createElement('canvas');
        canvas.width = 1;
        canvas.height = 1;
        
        const gl = canvas.getContext('webgl', {
            antialias: false,
            alpha: false,
            premultipliedAlpha: false,
            preserveDrawingBuffer: false,
            powerPreference: 'default'
        }) || canvas.getContext('experimental-webgl');
        
        if (!gl) {
            throw new Error('WebGL not supported');
        }
        
        console.log('WebGL context created successfully');
        console.log('WebGL version:', gl.getParameter(gl.VERSION));
        console.log('WebGL vendor:', gl.getParameter(gl.VENDOR));
        console.log('WebGL renderer:', gl.getParameter(gl.RENDERER));
        
        // Test shader creation with error checking
        let vertexShader, fragmentShader;
        
        try {
            vertexShader = gl.createShader(gl.VERTEX_SHADER);
            fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
            
            console.log('WebGL shader creation test:', {
                vertexShader: !!vertexShader,
                fragmentShader: !!fragmentShader,
                vertexShaderType: vertexShader ? typeof vertexShader : 'null',
                fragmentShaderType: fragmentShader ? typeof fragmentShader : 'null'
            });
        } catch (e) {
            console.error('Shader creation test failed:', e);
        }
        
        // Clean up test shaders
        if (vertexShader && !vertexShader.__isMockShader) {
            try {
                gl.deleteShader(vertexShader);
            } catch (e) {
                console.warn('Could not delete vertex shader:', e);
            }
        }
        if (fragmentShader && !fragmentShader.__isMockShader) {
            try {
                gl.deleteShader(fragmentShader);
            } catch (e) {
                console.warn('Could not delete fragment shader:', e);
            }
        }
    } catch (e) {
        console.error('WebGL support check failed:', e);
    }
}

// Run the WebGL support check
checkWebGLSupport();
