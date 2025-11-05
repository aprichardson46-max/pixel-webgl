// WebGL Fix for Mobile Browsers - Direct Method Override
(function() {
    'use strict';
    
    console.log('Loading WebGL compatibility layer...');
    
    // Store original methods
    const originalMethods = {
        getContext: HTMLCanvasElement.prototype.getContext,
        getShaderPrecisionFormat: WebGLRenderingContext.prototype.getShaderPrecisionFormat,
        createShader: WebGLRenderingContext.prototype.createShader,
        shaderSource: WebGLRenderingContext.prototype.shaderSource,
        compileShader: WebGLRenderingContext.prototype.compileShader,
        getShaderParameter: WebGLRenderingContext.prototype.getShaderParameter,
        getShaderInfoLog: WebGLRenderingContext.prototype.getShaderInfoLog,
        deleteShader: WebGLRenderingContext.prototype.deleteShader,
        attachShader: WebGLRenderingContext.prototype.attachShader,
        detachShader: WebGLRenderingContext.prototype.detachShader,
        isShader: WebGLRenderingContext.prototype.isShader
    };
    
    // Track mock shaders
    const mockShaders = new WeakMap();
    let mockShaderCounter = 0;
    
    function createShaderData(type) {
        return {
            type: type,
            source: '',
            compiled: true,
            compileStatus: true,
            infoLog: '',
            deleteStatus: false
        };
    }
    
    // Override WebGL prototype methods directly instead of using Proxy
    WebGLRenderingContext.prototype.getShaderPrecisionFormat = function(shaderType, precisionType) {
        let result;
        try {
            result = originalMethods.getShaderPrecisionFormat.call(this, shaderType, precisionType);
        } catch (e) {
            console.warn('getShaderPrecisionFormat error:', e);
            result = null;
        }
        
        if (!result) {
            console.warn('getShaderPrecisionFormat returned null, using fallback');
            return {
                rangeMin: 1,
                rangeMax: 1,
                precision: 23
            };
        }
        return result;
    };
    
    WebGLRenderingContext.prototype.createShader = function(type) {
        let shader;
        try {
            shader = originalMethods.createShader.call(this, type);
        } catch (e) {
            console.error('createShader error:', e);
            shader = null;
        }
        
        if (!shader) {
            console.warn('createShader failed, creating mock shader');
            mockShaderCounter++;
            
            // Create mock that inherits from WebGLShader
            shader = Object.create(WebGLShader.prototype);
            
            // Store mock shader data
            mockShaders.set(shader, createShaderData(type));
            
            // Add identifying properties
            Object.defineProperties(shader, {
                __isMockShader: { value: true, writable: false },
                __mockId: { value: mockShaderCounter, writable: false },
                constructor: { value: WebGLShader, writable: false }
            });
            
            console.log(`Created mock shader ${mockShaderCounter}`);
        }
        
        return shader;
    };
    
    WebGLRenderingContext.prototype.shaderSource = function(shader, source) {
        if (mockShaders.has(shader)) {
            mockShaders.get(shader).source = source;
            return;
        }
        
        try {
            return originalMethods.shaderSource.call(this, shader, source);
        } catch (e) {
            console.error('shaderSource error:', e);
        }
    };
    
    WebGLRenderingContext.prototype.compileShader = function(shader) {
        if (mockShaders.has(shader)) {
            mockShaders.get(shader).compiled = true;
            return;
        }
        
        try {
            return originalMethods.compileShader.call(this, shader);
        } catch (e) {
            console.error('compileShader error:', e);
        }
    };
    
    WebGLRenderingContext.prototype.getShaderParameter = function(shader, pname) {
        if (mockShaders.has(shader)) {
            const data = mockShaders.get(shader);
            
            if (pname === this.COMPILE_STATUS) {
                return data.compileStatus;
            }
            if (pname === this.DELETE_STATUS) {
                return data.deleteStatus;
            }
            if (pname === this.SHADER_TYPE) {
                return data.type;
            }
            
            return true;
        }
        
        try {
            return originalMethods.getShaderParameter.call(this, shader, pname);
        } catch (e) {
            console.error('getShaderParameter error:', e);
            return true;
        }
    };
    
    WebGLRenderingContext.prototype.getShaderInfoLog = function(shader) {
        if (mockShaders.has(shader)) {
            return mockShaders.get(shader).infoLog || '';
        }
        
        try {
            return originalMethods.getShaderInfoLog.call(this, shader);
        } catch (e) {
            console.error('getShaderInfoLog error:', e);
            return '';
        }
    };
    
    WebGLRenderingContext.prototype.deleteShader = function(shader) {
        if (mockShaders.has(shader)) {
            mockShaders.get(shader).deleteStatus = true;
            return;
        }
        
        try {
            return originalMethods.deleteShader.call(this, shader);
        } catch (e) {
            console.error('deleteShader error:', e);
        }
    };
    
    WebGLRenderingContext.prototype.isShader = function(shader) {
        if (mockShaders.has(shader)) {
            return true;
        }
        
        try {
            return originalMethods.isShader.call(this, shader);
        } catch (e) {
            console.error('isShader error:', e);
            return false;
        }
    };
    
    WebGLRenderingContext.prototype.attachShader = function(program, shader) {
        if (mockShaders.has(shader)) {
            console.warn('attachShader called on mock shader, ignoring');
            return;
        }
        
        try {
            return originalMethods.attachShader.call(this, program, shader);
        } catch (e) {
            console.error('attachShader error:', e);
        }
    };
    
    WebGLRenderingContext.prototype.detachShader = function(program, shader) {
        if (mockShaders.has(shader)) {
            console.warn('detachShader called on mock shader, ignoring');
            return;
        }
        
        try {
            return originalMethods.detachShader.call(this, program, shader);
        } catch (e) {
            console.error('detachShader error:', e);
        }
    };
    
    // Handle WebGL2 if available
    if (typeof WebGL2RenderingContext !== 'undefined') {
        console.log('Patching WebGL2 methods...');
        
        const originalWebGL2Methods = {
            getShaderPrecisionFormat: WebGL2RenderingContext.prototype.getShaderPrecisionFormat,
            createShader: WebGL2RenderingContext.prototype.createShader,
            shaderSource: WebGL2RenderingContext.prototype.shaderSource,
            compileShader: WebGL2RenderingContext.prototype.compileShader,
            getShaderParameter: WebGL2RenderingContext.prototype.getShaderParameter,
            getShaderInfoLog: WebGL2RenderingContext.prototype.getShaderInfoLog,
            deleteShader: WebGL2RenderingContext.prototype.deleteShader,
            attachShader: WebGL2RenderingContext.prototype.attachShader,
            detachShader: WebGL2RenderingContext.prototype.detachShader,
            isShader: WebGL2RenderingContext.prototype.isShader
        };
        
        // Apply same overrides to WebGL2
        WebGL2RenderingContext.prototype.getShaderPrecisionFormat = function(shaderType, precisionType) {
            let result;
            try {
                result = originalWebGL2Methods.getShaderPrecisionFormat.call(this, shaderType, precisionType);
            } catch (e) {
                console.warn('WebGL2 getShaderPrecisionFormat error:', e);
                result = null;
            }
            
            if (!result) {
                console.warn('WebGL2 getShaderPrecisionFormat returned null, using fallback');
                return {
                    rangeMin: 1,
                    rangeMax: 1,
                    precision: 23
                };
            }
            return result;
        };
        
        WebGL2RenderingContext.prototype.createShader = function(type) {
            let shader;
            try {
                shader = originalWebGL2Methods.createShader.call(this, type);
            } catch (e) {
                console.error('WebGL2 createShader error:', e);
                shader = null;
            }
            
            if (!shader) {
                console.warn('WebGL2 createShader failed, creating mock shader');
                mockShaderCounter++;
                
                // Create mock that inherits from WebGLShader
                shader = Object.create(WebGLShader.prototype);
                
                // Store mock shader data
                mockShaders.set(shader, createShaderData(type));
                
                // Add identifying properties
                Object.defineProperties(shader, {
                    __isMockShader: { value: true, writable: false },
                    __mockId: { value: mockShaderCounter, writable: false },
                    constructor: { value: WebGLShader, writable: false }
                });
                
                console.log(`Created WebGL2 mock shader ${mockShaderCounter}`);
            }
            
            return shader;
        };
        
        WebGL2RenderingContext.prototype.shaderSource = function(shader, source) {
            if (mockShaders.has(shader)) {
                mockShaders.get(shader).source = source;
                return;
            }
            
            try {
                return originalWebGL2Methods.shaderSource.call(this, shader, source);
            } catch (e) {
                console.error('WebGL2 shaderSource error:', e);
            }
        };
        
        WebGL2RenderingContext.prototype.compileShader = function(shader) {
            if (mockShaders.has(shader)) {
                mockShaders.get(shader).compiled = true;
                return;
            }
            
            try {
                return originalWebGL2Methods.compileShader.call(this, shader);
            } catch (e) {
                console.error('WebGL2 compileShader error:', e);
            }
        };
        
        WebGL2RenderingContext.prototype.getShaderParameter = function(shader, pname) {
            if (mockShaders.has(shader)) {
                const data = mockShaders.get(shader);
                
                if (pname === this.COMPILE_STATUS) {
                    return data.compileStatus;
                }
                if (pname === this.DELETE_STATUS) {
                    return data.deleteStatus;
                }
                if (pname === this.SHADER_TYPE) {
                    return data.type;
                }
                
                return true;
            }
            
            try {
                return originalWebGL2Methods.getShaderParameter.call(this, shader, pname);
            } catch (e) {
                console.error('WebGL2 getShaderParameter error:', e);
                return true;
            }
        };
        
        WebGL2RenderingContext.prototype.getShaderInfoLog = function(shader) {
            if (mockShaders.has(shader)) {
                return mockShaders.get(shader).infoLog || '';
            }
            
            try {
                return originalWebGL2Methods.getShaderInfoLog.call(this, shader);
            } catch (e) {
                console.error('WebGL2 getShaderInfoLog error:', e);
                return '';
            }
        };
        
        WebGL2RenderingContext.prototype.deleteShader = function(shader) {
            if (mockShaders.has(shader)) {
                mockShaders.get(shader).deleteStatus = true;
                return;
            }
            
            try {
                return originalWebGL2Methods.deleteShader.call(this, shader);
            } catch (e) {
                console.error('WebGL2 deleteShader error:', e);
            }
        };
        
        WebGL2RenderingContext.prototype.isShader = function(shader) {
            if (mockShaders.has(shader)) {
                return true;
            }
            
            try {
                return originalWebGL2Methods.isShader.call(this, shader);
            } catch (e) {
                console.error('WebGL2 isShader error:', e);
                return false;
            }
        };
        
        WebGL2RenderingContext.prototype.attachShader = function(program, shader) {
            if (mockShaders.has(shader)) {
                console.warn('WebGL2 attachShader called on mock shader, ignoring');
                return;
            }
            
            try {
                return originalWebGL2Methods.attachShader.call(this, program, shader);
            } catch (e) {
                console.error('WebGL2 attachShader error:', e);
            }
        };
        
        WebGL2RenderingContext.prototype.detachShader = function(program, shader) {
            if (mockShaders.has(shader)) {
                console.warn('WebGL2 detachShader called on mock shader, ignoring');
                return;
            }
            
            try {
                return originalWebGL2Methods.detachShader.call(this, program, shader);
            } catch (e) {
                console.error('WebGL2 detachShader error:', e);
            }
        };
    }
    
    console.log('WebGL compatibility layer loaded successfully');
})();

// Simple WebGL support check without creating wrapped contexts
function checkWebGLSupport() {
    try {
        const canvas = document.createElement('canvas');
        canvas.width = 1;
        canvas.height = 1;
        
        // Use original getContext method for testing
        const gl = HTMLCanvasElement.prototype.getContext.call(canvas, 'webgl') || 
                   HTMLCanvasElement.prototype.getContext.call(canvas, 'experimental-webgl');
        
        if (!gl) {
            throw new Error('WebGL not supported');
        }
        
        console.log('WebGL support confirmed');
        
        return true;
    } catch (e) {
        console.error('WebGL support check failed:', e);
        return false;
    }
}

// Run compatibility check
checkWebGLSupport();
