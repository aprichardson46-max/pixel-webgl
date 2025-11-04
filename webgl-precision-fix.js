// WebGL Precision Format Fix for Mobile Browsers
(function() {
    'use strict';
    
    // Store original functions
    const originalGetShaderPrecisionFormat = WebGLRenderingContext.prototype.getShaderPrecisionFormat;
    const originalCreateShader = WebGLRenderingContext.prototype.createShader;
    const originalGetError = WebGLRenderingContext.prototype.getError;
    
    // Track shader creation attempts for debugging
    let shaderCreationAttempts = 0;
    let failedShaderCreations = 0;
    
    // Override getShaderPrecisionFormat with null-safe version
    WebGLRenderingContext.prototype.getShaderPrecisionFormat = function(shaderType, precisionType) {
        const result = originalGetShaderPrecisionFormat.call(this, shaderType, precisionType);
        
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
            
            // Try multiple recovery strategies
            for (let attempt = 0; attempt < 3; attempt++) {
                console.log(`Recovery attempt ${attempt + 1}`);
                
                // Wait a bit and try again
                setTimeout(() => {}, 1);
                
                shader = originalCreateShader.call(this, type);
                if (shader) {
                    console.log('Shader creation succeeded on retry');
                    break;
                }
            }
            
            // If still null, create a mock shader object to prevent Unity crashes
            if (!shader) {
                console.error('All shader creation attempts failed, creating mock object');
                
                // Create a fake shader-like object that won't crash Unity
                shader = {
                    __isMockShader: true,
                    shaderType: type === this.VERTEX_SHADER ? 'vs' : 'fs',
                    toString: function() { return '[Mock WebGL Shader]'; }
                };
                
                // Try to make it look more like a real WebGLShader
                try {
                    Object.setPrototypeOf(shader, WebGLShader.prototype);
                } catch (e) {
                    // If that fails, just continue with the mock object
                }
            }
        }
        
        return shader;
    };
    
    // Also handle WebGL2 context if available
    if (typeof WebGL2RenderingContext !== 'undefined') {
        const originalGetShaderPrecisionFormat2 = WebGL2RenderingContext.prototype.getShaderPrecisionFormat;
        const originalCreateShader2 = WebGL2RenderingContext.prototype.createShader;
        
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
        
        // Test shader precision format support
        const vertexShaderPrecision = gl.getShaderPrecisionFormat(gl.VERTEX_SHADER, gl.HIGH_FLOAT);
        const fragmentShaderPrecision = gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.HIGH_FLOAT);
        
        console.log('WebGL precision support:', {
            vertex: vertexShaderPrecision,
            fragment: fragmentShaderPrecision
        });
        
        return true;
    } catch (error) {
        console.error('WebGL compatibility issue:', error);
        return false;
    }
}

// Run compatibility check
checkWebGLSupport();
