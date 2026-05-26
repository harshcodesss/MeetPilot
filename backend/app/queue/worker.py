def extract(session_id):

    #RQ workers run in a separate process. Sometimes the worker starts with the wrong working directory or missing PYTHONPATH, causing errors.
    #To fix this, we import the models inside the job function, ensuring the worker can always find them.
    from app import models

    print(f"[worker] would extract {session_id}")
    return