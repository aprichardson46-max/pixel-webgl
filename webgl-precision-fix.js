// WebGL Precision Format Fix for Mobile Browsers
(function() {
    'use strict';
    
    // Store original functions
    const originalGetShaderPrecisionFormat = WebGLRenderingContext.prototype.getShaderPrecisionFormat;
    const originalCreateShader = WebGLRenderingContext.prototype.createShader;
    const originalGetError = WebGLRenderingContext.prototype.getError;
    
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
    
    // Override createShader to handle null returns
    WebGLRenderingContext.prototype.createShader = function(type) {
        const shader = originalCreateShader.call(this, type);
        
        if (!shader) {
            console.error('createShader failed for type:', type === this.VERTEX_SHADER ? 'VERTEX_SHADER' : 'FRAGMENT_SHADER');
            const error = this.getError();
            console.error('WebGL error code:', error);
            
            // Try to create a basic shader object as fallback
            try {
                return originalCreateShader.call(this, type);
            } catch (e) {
                console.error('Shader creation completely failed:', e);
                return null;
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
            const shader = originalCreateShader2.call(this, type);
            
            if (!shader) {
                console.error('WebGL2 createShader failed for type:', type === this.VERTEX_SHADER ? 'VERTEX_SHADER' : 'FRAGMENT_SHADER');
                const error = this.getError();
                console.error('WebGL2 error code:', error);
                
                try {
                    return originalCreateShader2.call(this, type);
                } catch (e) {
                    console.error('WebGL2 shader creation completely failed:', e);
                    return null;
                }
            }
            
            return shader;
        };
    }
})();

// Additional WebGL compatibility checks
function checkWebGLSupport() {
    try {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        
        if (!gl) {
            throw new Error('WebGL not supported');
        }
        
        // Test shader creation
        const vertexShader = gl.createShader(gl.VERTEX_SHADER);
        const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
        
        console.log('WebGL shader creation test:', {
            vertexShader: !!vertexShader,
            fragmentShader: !!fragmentShader
        });
        
        // Clean up test shaders
        if (vertexShader) gl.deleteShader(vertexShader);
        if (fragmentShader) gl.deleteShader(fragmentShader);
        
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
